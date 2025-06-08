import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const didApiKey = process.env.DID_API_KEY;
    
    if (!didApiKey) {
      return NextResponse.json(
        { error: 'D-ID API key not configured' },
        { status: 500 }
      );
    }

    // Fetch avatars from D-ID Premium Presenters endpoint
    const response = await fetch('https://api.d-id.com/clips/presenters', {
      headers: {
        'Authorization': `Basic ${btoa(didApiKey)}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to fetch avatars' },
        { status: response.status }
      );
    }

    // Handle different response formats
    let presentersArray = [];
    if (Array.isArray(data)) {
      presentersArray = data;
    } else if (data.presenters && Array.isArray(data.presenters)) {
      presentersArray = data.presenters;
    } else if (data.result && Array.isArray(data.result)) {
      presentersArray = data.result;
    } else {
      // If it's an object with presenter entries, convert to array
      presentersArray = Object.values(data);
    }

    // Transform the data to match our frontend interface
    const avatars = presentersArray.slice(0, 4).map((avatar: any) => {
      // Use gender-appropriate default voice if none provided
      const getDefaultVoice = (gender: string) => {
        return gender === 'male' ? 'en-US-DavisNeural' : 'en-US-AriaNeural';
      };

      return {
        id: avatar.presenter_id,
        name: avatar.name || `Avatar ${avatar.presenter_id}`,
        image: avatar.image_url || avatar.thumbnail_url,
        voice: avatar.voice ? `${avatar.voice.type} (${avatar.voice.voice_id})` : 'Professional, AI-generated',
        specialty: `${avatar.gender} presenter, ${avatar.is_streamable ? 'streamable' : 'high-quality'}`,
        voiceId: avatar.voice?.voice_id || getDefaultVoice(avatar.gender),
        gender: avatar.gender,
        isStreamable: avatar.is_streamable || false
      };
    }).filter((avatar: any) => avatar.id && avatar.name && avatar.image);

    // If no avatars returned from D-ID, provide some fallback avatars
    if (avatars.length === 0) {
      const fallbackAvatars = [
        {
          id: 'fallback-1',
          name: 'Professional Avatar',
          image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=800',
          voice: 'Authoritative, confident, corporate',
          specialty: 'Business presentations, auctions',
          voiceId: 'en-US-DavisNeural'
        },
        {
          id: 'fallback-2',
          name: 'Friendly Avatar',
          image: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=800',
          voice: 'Analytical, calm, methodical',
          specialty: 'Investigations, analysis',
          voiceId: 'en-US-AriaNeural'
        }
      ];
      return NextResponse.json({ avatars: fallbackAvatars });
    }

    return NextResponse.json({ avatars });
  } catch (error) {
    console.error('Error in get-avatars API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 