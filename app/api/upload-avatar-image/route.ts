import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPG, PNG, or WebP images.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = path.extname(file.name);
    const filename = `avatar-${timestamp}${fileExtension}`;
    
    // Save to public/avatars folder
    const filepath = path.join(process.cwd(), 'public', 'avatars', filename);
    await writeFile(filepath, buffer);
    
    // Return the public URL
    const publicUrl = `/avatars/${filename}`;
    
    console.log('Avatar uploaded successfully:', { filename, publicUrl });
    
    return NextResponse.json({
      success: true,
      filename,
      url: publicUrl
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
} 