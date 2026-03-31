#!/usr/bin/env python3
"""
Transcribe and diarize meeting recordings using OpenAI API
"""
import os
import json
import subprocess
import tempfile
from pathlib import Path
from openai import OpenAI

# Meeting metadata
MEETINGS = [
    {
        "file": "/Users/rahul/Desktop/VBS Portal Rahul <> Kavya.m4a",
        "name": "VBS Portal Feedback",
        "speakers": ["Rahul", "Kavya"],
        "context": "VBS portal feedback session with Rahul and Kavya",
        "output": "docs/meetings/vbs-portal-feedback-kavya.md"
    },
    {
        "file": "/Users/rahul/Desktop/Rahul Roni + Delivery.m4a",
        "name": "Delivery Team Meeting",
        "speakers": ["Rahul", "Roni"],
        "context": "Delivery team meeting with Rahul and Roni",
        "output": "docs/meetings/delivery-team-rahul-roni.md"
    },
    {
        "file": "/Users/rahul/Desktop/Rahul Roni etc..m4a",
        "name": "Team Meeting - Data Modelling",
        "speakers": ["Rahul", "Roni", "Anoop (CTO)", "Data Modelling Engineer"],
        "context": "Team meeting discussing data modelling with Rahul, Roni, Anoop (CTO), and data modelling engineer",
        "output": "docs/meetings/team-meeting-data-modelling.md"
    }
]

def compress_audio(input_path: str, max_size_mb: int = 24) -> str:
    """
    Compress audio file to be under the specified size limit
    Returns path to compressed file
    """
    input_size_mb = Path(input_path).stat().st_size / (1024 * 1024)

    if input_size_mb <= max_size_mb:
        return input_path

    print(f"  → Compressing {input_size_mb:.1f}MB file to under {max_size_mb}MB...")

    # Create temporary file for compressed audio
    temp_file = tempfile.NamedTemporaryFile(suffix='.m4a', delete=False)
    temp_path = temp_file.name
    temp_file.close()

    # Calculate target bitrate to stay under size limit
    # Get duration first
    probe_cmd = [
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        input_path
    ]
    duration = float(subprocess.check_output(probe_cmd).decode().strip())

    # Target bitrate in kbps (leaving 10% margin)
    target_bitrate = int((max_size_mb * 1024 * 8 * 0.9) / duration)

    # Compress audio
    compress_cmd = [
        'ffmpeg', '-i', input_path,
        '-c:a', 'aac',
        '-b:a', f'{target_bitrate}k',
        '-ac', '1',  # Mono
        '-ar', '16000',  # 16kHz sample rate (good for speech)
        '-y',  # Overwrite
        temp_path
    ]

    subprocess.run(compress_cmd, capture_output=True, check=True)

    compressed_size_mb = Path(temp_path).stat().st_size / (1024 * 1024)
    print(f"  → Compressed to {compressed_size_mb:.1f}MB")

    return temp_path

def transcribe_with_diarization(client: OpenAI, audio_file_path: str, meeting_context: str, speakers: list[str]) -> dict:
    """
    Transcribe audio file with speaker diarization using OpenAI API
    """
    print(f"  → Transcribing {Path(audio_file_path).name}...")

    # Compress audio if needed
    compressed_path = compress_audio(audio_file_path)
    cleanup_compressed = compressed_path != audio_file_path

    try:
        with open(compressed_path, "rb") as audio_file:
            # First, get the basic transcription with timestamps
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["segment"]
            )

        # Now use GPT-4 to analyze and add speaker labels
        print(f"  → Analyzing speaker patterns...")

        # Prepare the transcript text with timestamps
        segments_text = []
        for segment in transcript.segments:
            # Access using dot notation, not subscript
            segments_text.append(f"[{segment.start:.2f}s - {segment.end:.2f}s] {segment.text}")
    finally:
        # Clean up compressed file if we created one
        if cleanup_compressed and Path(compressed_path).exists():
            Path(compressed_path).unlink()

    full_transcript = "\n".join(segments_text)

    # Process in chunks if transcript is very long (to avoid JSON parsing issues)
    MAX_SEGMENTS_PER_CHUNK = 50
    all_diarized_segments = []

    # Split into chunks
    for i in range(0, len(segments_text), MAX_SEGMENTS_PER_CHUNK):
        chunk = segments_text[i:i + MAX_SEGMENTS_PER_CHUNK]
        chunk_text = "\n".join(chunk)

        # Use GPT-4 to identify speakers for this chunk
        diarization_prompt = f"""Analyze this meeting transcript chunk and identify which speaker is saying each line.

Meeting Context: {meeting_context}
Expected Speakers: {', '.join(speakers)}

Transcript chunk ({i+1} to {min(i+MAX_SEGMENTS_PER_CHUNK, len(segments_text))} of {len(segments_text)} segments):
{chunk_text}

Instructions:
1. Analyze content and speaking patterns to determine which speaker is talking in each segment
2. Consider topic expertise, questions vs answers, and speaking style
3. Return ONLY valid JSON with each segment labeled with the speaker name
4. Use only these speaker names: {', '.join(speakers)}
5. Preserve exact timestamps and text from input

Return this exact JSON format (no markdown, no explanation):
{{"segments": [{{"timestamp": "X.XXs - Y.YYs", "speaker": "Name", "text": "exact text"}}]}}"""

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are an expert at analyzing meeting transcripts. Return ONLY valid JSON, no markdown code blocks or extra text."},
                        {"role": "user", "content": diarization_prompt}
                    ],
                    temperature=0.2
                )

                content = response.choices[0].message.content.strip()

                # Remove markdown code blocks if present
                if content.startswith("```"):
                    lines = content.split("\n")
                    content = "\n".join(lines[1:-1]) if len(lines) > 2 else content

                diarized_chunk = json.loads(content)
                all_diarized_segments.extend(diarized_chunk["segments"])
                break

            except json.JSONDecodeError as e:
                if attempt < max_retries - 1:
                    print(f"  → JSON parsing error (attempt {attempt + 1}/{max_retries}), retrying...")
                    continue
                else:
                    print(f"  → Failed to parse JSON after {max_retries} attempts: {e}")
                    # Fallback: use first speaker for all segments in this chunk
                    for seg_text in chunk:
                        timestamp_match = seg_text.split("] ", 1)
                        if len(timestamp_match) == 2:
                            timestamp = timestamp_match[0][1:]
                            text = timestamp_match[1]
                            all_diarized_segments.append({
                                "timestamp": timestamp,
                                "speaker": speakers[0],
                                "text": text
                            })

    diarized = {"segments": all_diarized_segments}

    # Get duration and language
    duration = getattr(transcript, 'duration', None)
    language = getattr(transcript, 'language', 'unknown')

    # Format duration nicely
    if duration:
        minutes = int(duration // 60)
        seconds = int(duration % 60)
        duration_str = f"{minutes}m {seconds}s"
    else:
        duration_str = "unknown"

    return {
        "raw_transcript": transcript,
        "diarized_segments": diarized["segments"],
        "metadata": {
            "duration": duration_str,
            "language": language
        }
    }

def format_transcript_markdown(meeting_info: dict, transcription: dict) -> str:
    """
    Format the diarized transcript as clean markdown
    """
    md = f"""# {meeting_info['name']}

**Date**: {Path(meeting_info['file']).stem}
**Participants**: {', '.join(meeting_info['speakers'])}
**Context**: {meeting_info['context']}
**Duration**: {transcription['metadata']['duration']}
**Language**: {transcription['metadata']['language']}

---

## Transcript

"""

    # Group consecutive segments by speaker
    current_speaker = None
    speaker_text = []

    for segment in transcription['diarized_segments']:
        speaker = segment['speaker']
        text = segment['text'].strip()
        timestamp = segment['timestamp']

        if speaker != current_speaker:
            # Write previous speaker's block
            if current_speaker and speaker_text:
                md += f"\n**{current_speaker}**: {' '.join(speaker_text)}\n"

            # Start new speaker block
            current_speaker = speaker
            speaker_text = [f"_{timestamp}_ {text}"]
        else:
            speaker_text.append(text)

    # Write the last speaker's block
    if current_speaker and speaker_text:
        md += f"\n**{current_speaker}**: {' '.join(speaker_text)}\n"

    md += "\n---\n\n_Transcribed and diarized using OpenAI Whisper and GPT-4o_\n"

    return md

def main():
    # Check for OpenAI API key
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ Error: OPENAI_API_KEY environment variable not set")
        print("   Set it with: export OPENAI_API_KEY='your-key-here'")
        return

    client = OpenAI(api_key=api_key)

    print(f"\n🎙️  Transcribing {len(MEETINGS)} meeting recordings...\n")

    # Create output directory
    output_dir = Path("docs/meetings")
    output_dir.mkdir(parents=True, exist_ok=True)

    for i, meeting in enumerate(MEETINGS, 1):
        print(f"\n[{i}/{len(MEETINGS)}] Processing: {meeting['name']}")
        print(f"  File: {Path(meeting['file']).name}")

        # Check if file exists
        if not Path(meeting['file']).exists():
            print(f"  ⚠️  File not found, skipping...")
            continue

        try:
            # Transcribe and diarize
            transcription = transcribe_with_diarization(
                client=client,
                audio_file_path=meeting['file'],
                meeting_context=meeting['context'],
                speakers=meeting['speakers']
            )

            # Format as markdown
            markdown = format_transcript_markdown(meeting, transcription)

            # Save to file
            output_path = Path(meeting['output'])
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(markdown, encoding='utf-8')

            print(f"  ✅ Saved to: {meeting['output']}")

        except Exception as e:
            print(f"  ❌ Error: {str(e)}")
            continue

    print(f"\n✨ Done! Transcripts saved to docs/meetings/\n")

if __name__ == "__main__":
    main()
