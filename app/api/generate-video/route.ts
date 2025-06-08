import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, avatarImage, voiceId, gender, speechRate, speechPitch } = await request.json();
    
    console.log('Generate video request:', { text, avatarImage, voiceId, gender, speechRate, speechPitch });
    
    const didApiKey = process.env.DID_API_KEY;
    
    if (!didApiKey) {
      return NextResponse.json(
        { error: 'D-ID API key not configured' },
        { status: 500 }
      );
    }

    if (!text || !avatarImage || !voiceId) {
      console.log('Missing parameters:', { text: !!text, avatarImage: !!avatarImage, voiceId: !!voiceId });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Convert Microsoft voice to Amazon equivalent
    const getAmazonVoice = (microsoftVoice: string, avatarGender?: string) => {
      const voiceMap: { [key: string]: string } = {
        'en-US-AriaNeural': 'Aria',
        'en-US-JennyNeural': 'Joanna',
        'en-US-DavisNeural': 'Matthew',
        'en-US-BrianMultilingualNeural': 'Brian',
        'en-US-EmmaMultilingualNeural': 'Emma',
        'en-US-AndrewMultilingualNeural': 'Matthew',
        'en-US-AshleyNeural': 'Aria',
        'en-US-GuyNeural': 'Joey',
        'en-US-SaraNeural': 'Aria',
        'en-US-NovaTurboMultilingualNeural': 'Aria',
        'en-US-AlloyTurboMultilingualNeural': 'Matthew',
        'en-US-OnyxTurboMultilingualNeural': 'Matthew',
        'en-US-SteffanMultilingualNeural': 'Matthew',
        'en-US-RyanMultilingualNeural': 'Matthew',
        'en-GB-AdaMultilingualNeural': 'Amy',
        'en-GB-OliverNeural': 'Brian',
        'en-GB-OllieMultilingualNeural': 'Brian',
        'en-AU-WilliamNeural': 'Matthew',
        'es-US-PalomaNeural': 'Lucia'
      };
      
      let mappedVoice = voiceMap[microsoftVoice];
      
      // If no mapping found, use gender-appropriate default
      if (!mappedVoice) {
        mappedVoice = avatarGender === 'male' ? 'Matthew' : 'Aria';
      }
      
      console.log('Voice mapping:', { microsoftVoice, avatarGender, mappedVoice });
      return mappedVoice;
    };

    const requestBody = {
      presenter_id: avatarImage,
      script: {
        type: 'text',
        input: text,
                  provider: {
            type: 'amazon',
            voice_id: getAmazonVoice(voiceId, gender),
            voice_config: {
              rate: (speechRate || 1).toString(),
              pitch: (speechPitch || 1).toString()
            }
          }
      },
      background: {
        color: '#FFFFFF'
      }
    };
    
    console.log('Sending to D-ID API:', JSON.stringify(requestBody, null, 2));

    // Create video with D-ID Clips API (Premium Presenters)
    const response = await fetch('https://api.d-id.com/clips', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(didApiKey)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    console.log('D-ID API Response:', response.status, data);
    
    if (!response.ok) {
      console.error('D-ID API Error:', data);
      return NextResponse.json(
        { error: data.message || data.error || 'Failed to create video' },
        { status: response.status }
      );
    }

    return NextResponse.json({ videoId: data.id });
  } catch (error) {
    console.error('Error in generate-video API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
