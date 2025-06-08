import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, imageUrl, voiceId, gender, hasCustomVoice, speechRate, speechPitch } = await request.json();
    
    console.log('Custom avatar video request:', { text, imageUrl, voiceId, gender, hasCustomVoice, speechRate, speechPitch });
    
    const didApiKey = process.env.DID_API_KEY;
    
    if (!didApiKey) {
      return NextResponse.json(
        { error: 'D-ID API key not configured' },
        { status: 500 }
      );
    }

    if (!text || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters: text and imageUrl' },
        { status: 400 }
      );
    }

    // Convert local path to full URL if needed
    let fullImageUrl = imageUrl;
    if (imageUrl.startsWith('/avatars/')) {
      // For local files, we need the full URL for D-ID API
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NODE_ENV === 'production'
        ? 'https://your-domain.com' // Replace with your actual domain
        : 'http://localhost:3000';
      fullImageUrl = `${baseUrl}${imageUrl}`;
    }
    
    console.log('Full image URL for D-ID:', fullImageUrl);

    // Handle custom cloned voices or convert Microsoft voice to Amazon equivalent
    const getVoiceId = (voiceId: string, avatarGender?: string, hasCustomVoice?: boolean) => {
      // If it's a custom cloned voice (usually starts with custom_ or cloned_)
      if (hasCustomVoice || voiceId.startsWith('custom_') || voiceId.startsWith('cloned_')) {
        console.log('Using custom cloned voice:', voiceId);
        return voiceId; // Return cloned voice ID as-is
      }
      
      // Otherwise convert Microsoft voice to Amazon equivalent
      const voiceMap: { [key: string]: string } = {
        'en-US-AriaNeural': 'Aria',
        'en-US-JennyNeural': 'Joanna',
        'en-US-DavisNeural': 'Matthew',
        'en-US-BrianMultilingualNeural': 'Brian',
        'en-US-EmmaMultilingualNeural': 'Emma',
        'en-US-AndrewMultilingualNeural': 'Matthew',
      };
      
      let mappedVoice = voiceMap[voiceId];
      if (!mappedVoice) {
        mappedVoice = avatarGender === 'male' ? 'Matthew' : 'Aria';
      }
      
      console.log('Voice mapping:', { voiceId, avatarGender, mappedVoice, hasCustomVoice });
      return mappedVoice;
    };

    const finalVoiceId = getVoiceId(voiceId, gender, hasCustomVoice);
    const isClonedVoice = hasCustomVoice || voiceId.startsWith('custom_') || voiceId.startsWith('cloned_');
    
    const requestBody = {
      source_url: fullImageUrl, // Use source_url for custom images
      script: {
        type: 'text',
        input: text,
        provider: {
          type: isClonedVoice ? 'microsoft' : 'amazon', // Cloned voices might use different provider
          voice_id: finalVoiceId,
          voice_config: {
            rate: (speechRate || 1).toString(),
            pitch: (speechPitch || 1).toString()
          }
        }
      },
      config: {
        fluent: true,
        pad_audio: 0.0,
        stitch: true,
        result_format: 'mp4'
      }
    };
    
    console.log('Sending custom avatar request to D-ID API:', JSON.stringify(requestBody, null, 2));

    // Use /talks endpoint for custom images
    const response = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(didApiKey)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    console.log('D-ID API Response for custom avatar:', response.status, data);
    
    if (!response.ok) {
      console.error('D-ID API Error for custom avatar:', data);
      return NextResponse.json(
        { error: data.message || data.error || 'Failed to create custom avatar video' },
        { status: response.status }
      );
    }

    return NextResponse.json({ videoId: data.id });
  } catch (error) {
    console.error('Error in upload-custom-avatar API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 