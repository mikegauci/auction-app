"use client";

import { useState, useEffect, useRef } from 'react';
import { Pause, Gavel, Volume2, Users, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';


// Avatar interface for type safety
interface Avatar {
  id: string;
  name: string;
  image: string;
  voice: string;
  specialty: string;
  voiceId: string;
  gender?: string;
  isStreamable?: boolean;
  isCustom?: boolean;
  hasCustomVoice?: boolean;
}

// Auction item data
const auctionItem = {
  lotNumber: "59557",
  title: "Pristine 1911 Pistol",
  description: "Welcome to tonight\'s exclusive firearms auction. Up first is a pristine 1911 pistol, known for its historical value and expert craftsmanship. Bidding begins at $5,000.",
  currentBid: 5000,
  askingPrice: 5500,
  estimatedValue: "5,000 - 7,500",
  condition: "Excellent",
  era: "WWI Era",
  image: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=400&h=300&fit=crop"
};

const script = {
  title: 'Live Auction',
  content: 'Welcome to tonight\'s exclusive firearms auction. Up first is a pristine 1911 pistol, known for its historical value and expert craftsmanship. Bidding begins at $5,000.'
};

export default function Home() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(true);
  const [avatarError, setAvatarError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState('');
  const [videoStatus, setVideoStatus] = useState('');
  const [currentBid, setCurrentBid] = useState(auctionItem.currentBid);
  const [bidders, setBidders] = useState(47);
  const [timeRemaining, setTimeRemaining] = useState('5:24');
  const [isScrolled, setIsScrolled] = useState(false);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const animationRef = useRef<number>();
  const videoRef = useRef<HTMLVideoElement>(null);



  // Load avatars from D-ID API
  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        setIsLoadingAvatars(true);
        setAvatarError('');
        
        const response = await fetch('/api/get-avatars');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch avatars');
        }
        
        // Filter to only show alex (streamable) and Alyssa
        const filteredAvatars = data.avatars.filter((avatar: Avatar) => {
          const name = avatar.name.toLowerCase();
          
          return (
            (name === 'alex' && avatar.specialty?.includes('streamable')) ||
            name === 'alyssa'
          );
        });
        
        // Add the custom avatar to the existing avatars
        const customAvatar: Avatar = {
          id: 'custom-avatar',
          name: 'John Wick',
          image: 'https://i.ibb.co/m5rrScPL/john-wick-2.png',
          voice: 'Matthew (Amazon)',
          specialty: 'Professional Auctioneer',
          voiceId: 'en-US-DavisNeural',
          gender: 'male',
          isStreamable: false,
          isCustom: true,
          hasCustomVoice: false
        };
        
        // Only use John Wick avatar
        const allAvatars = [customAvatar];
        
        setAvatars(allAvatars);
        setSelectedAvatar(customAvatar); // Always set John Wick as selected
      } catch (error) {
        console.error('Error fetching avatars:', error);
        setAvatarError(error instanceof Error ? error.message : 'Failed to load avatars');
      } finally {
        setIsLoadingAvatars(false);
      }
    };

    fetchAvatars();
  }, []);

  // Scroll detection for mobile fixed avatar
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 300); // Show fixed avatar after scrolling 300px
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Preload John Wick image for fixed avatar
  useEffect(() => {
    if (selectedAvatar?.image) {
      const img = new Image();
      img.src = selectedAvatar.image;
    }
  }, [selectedAvatar]);

  const generateDIDVideo = async (text: string) => {
    if (!selectedAvatar) {
      setVideoStatus('Please select an auctioneer first');
      return;
    }

    setIsGenerating(true);
    setVideoStatus('Auctioneer preparing...');

    try {
      const endpoint = selectedAvatar.isCustom ? '/api/upload-custom-avatar' : '/api/generate-video';
      const requestBody = selectedAvatar.isCustom ? {
        text,
        imageUrl: selectedAvatar.image,
        voiceId: selectedAvatar.voiceId,
        gender: selectedAvatar.gender,
        hasCustomVoice: selectedAvatar.hasCustomVoice
      } : {
        text,
        avatarImage: selectedAvatar.id,
        voiceId: selectedAvatar.voiceId,
        gender: selectedAvatar.gender
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create video');
      }
      
      if (data.videoId) {
        pollVideoStatus(data.videoId, text, selectedAvatar.id);
      } else {
        throw new Error('No video ID returned');
      }
    } catch (error) {
      console.error('Error generating video:', error);
      setVideoStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsGenerating(false);
    }
  };

  const pollVideoStatus = async (videoId: string, text: string, avatarImage: string) => {
    try {
      const endpoint = selectedAvatar?.isCustom 
        ? `/api/check-custom-video-status?videoId=${videoId}`
        : `/api/check-video-status?videoId=${videoId}`;
        
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check video status');
      }
      
      if (data.status === 'done' && data.result_url) {
        setGeneratedVideoUrl(data.result_url);
        setVideoStatus('Auction Live!');
        setIsGenerating(false);
        setIsPlaying(true);
      } else if (data.status === 'error') {
        setVideoStatus('Error starting auction');
        setIsGenerating(false);
      } else {
        setVideoStatus(`Preparing: ${data.status}`);
        setTimeout(() => pollVideoStatus(videoId, text, avatarImage), 2000);
      }
    } catch (error) {
      console.error('Error checking video status:', error);
      setVideoStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsGenerating(false);
    }
  };

  const startAnimation = () => {
    const animate = () => {
      setAudioProgress((prev) => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 0.5;
      });
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    animationRef.current = requestAnimationFrame(animate);
  };

  const handleStartAuction = async () => {
    if (isPlaying) {
      setIsPlaying(false);
      setAudioProgress(0);
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const textToSpeak = script.content;
    if (!textToSpeak.trim()) return;

    try {
      await generateDIDVideo(textToSpeak);
    } catch (error) {
      console.warn('D-ID video generation failed, falling back to browser TTS:', error);
      
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      utterance.onstart = () => {
        setIsPlaying(true);
        startAnimation();
      };
      
      utterance.onend = () => {
        setIsPlaying(false);
        setAudioProgress(0);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
      
      utterance.onerror = () => {
        setIsPlaying(false);
        setAudioProgress(0);
      };

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    }
  };



  const handleVideoEnded = () => {
    setIsPlaying(false);
    setAudioProgress(100);
  };

  const placeBid = () => {
    setCurrentBid(prev => prev + 250);
    setBidders(prev => prev + 1);
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Gavel className="w-10 h-10 text-blue-600 flex-shrink-0" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Premier Auctions</h1>
                <p className="text-sm sm:text-base text-slate-600 mt-1">Live Firearms Auction</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-lg">
                <Users className="w-5 h-5 text-slate-500" />
                <span className="text-sm font-medium">{bidders} bidders</span>
              </div>
              <div className="flex items-center space-x-2 bg-red-50 px-3 py-2 rounded-lg">
                <Clock className="w-5 h-5 text-red-500" />
                <span className="text-sm font-bold text-red-600">{timeRemaining}</span>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1.5 text-sm font-semibold">
                LIVE
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Mobile: Auctioneer First, Desktop: Right Column */}
          <div className="lg:hidden space-y-6">
            {/* Mobile Auctioneer Section */}
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Live Auctioneer</h3>
                    {isPlaying && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                        LIVE
                      </Badge>
                    )}
                  </div>

                  <div className="relative">
                    {generatedVideoUrl ? (
                      <div className="w-full aspect-square rounded-lg overflow-hidden border border-slate-200">
                        <video
                          ref={videoRef}
                          src={generatedVideoUrl}
                          className="w-full h-full object-cover"
                          autoPlay
                          onEnded={handleVideoEnded}
                          controls
                        />
                      </div>
                    ) : selectedAvatar ? (
                      <div className={`w-full aspect-square rounded-lg overflow-hidden border border-slate-200 ${isPlaying && !generatedVideoUrl ? 'animate-pulse' : ''}`}>
                        <img 
                          src={selectedAvatar.image} 
                          alt={selectedAvatar.name}
                          className="w-full h-full object-cover"
                        />
                        {isPlaying && !generatedVideoUrl && (
                          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent"></div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                        <p className="text-slate-500">Loading auctioneer...</p>
                      </div>
                    )}
                    
                    {(isGenerating || isPlaying) && (
                      <div className="absolute bottom-2 left-2">
                        <div className="flex space-x-1">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                              style={{ animationDelay: `${i * 0.1}s` }}
                            ></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Start Auction Control */}
                  <div className="space-y-3">
                    <Button
                      onClick={handleStartAuction}
                      disabled={isGenerating || !selectedAvatar}
                      className={`w-full py-3 text-lg font-semibold transition-all ${
                        isPlaying 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Starting...
                        </>
                      ) : isPlaying ? (
                        <>
                          <Pause className="w-5 h-5 mr-2" />
                          Stop Auction
                        </>
                      ) : (
                        <>
                          <Gavel className="w-5 h-5 mr-2" />
                          Start Auction
                        </>
                      )}
                    </Button>

                    <div className="flex items-center justify-center text-sm text-slate-500">
                      <Volume2 className="w-4 h-4 mr-2" />
                      {isGenerating ? 'Preparing auctioneer...' : 
                       isPlaying ? 'Auction in progress...' : 
                       'Ready to start auction'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Left Column - Auction Item */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lot Information */}
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Item Image */}
                  <div className="space-y-4">
                    <div className="relative">
                      <img 
                        src={auctionItem.image}
                        alt={auctionItem.title}
                        className="w-full h-64 object-cover rounded-lg border border-slate-200"
                      />
                      <div className="absolute top-4 left-4">
                        <div className="bg-slate-900 text-white px-3 py-1 rounded text-sm font-medium">
                          Lot {auctionItem.lotNumber}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Item Details */}
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">{auctionItem.title}</h2>
                      <p className="text-slate-600 leading-relaxed">{auctionItem.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                      <div>
                        <span className="text-sm text-slate-500">Condition</span>
                        <p className="font-medium">{auctionItem.condition}</p>
                      </div>
                      <div>
                        <span className="text-sm text-slate-500">Era</span>
                        <p className="font-medium">{auctionItem.era}</p>
                      </div>
                      <div>
                        <span className="text-sm text-slate-500">Estimated Value</span>
                        <p className="font-medium">${auctionItem.estimatedValue}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bidding Section */}
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-6 items-center">
                  <div className="text-center">
                    <p className="text-sm text-slate-500 mb-1">CURRENT BID</p>
                    <p className="text-3xl font-bold text-slate-900">${currentBid.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-500 mb-1">ASKING</p>
                    <p className="text-2xl font-bold text-blue-600">${(currentBid + 250).toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <Button 
                      onClick={placeBid}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-semibold w-full"
                    >
                      BID NOW
                    </Button>
                    <p className="text-xs text-slate-500 mt-2">Internet bid</p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column - Auctioneer & Controls (Desktop Only) */}
          <div className="hidden lg:block space-y-6">
            {/* Live Auctioneer with Selection */}
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Live Auctioneer</h3>
                    {isPlaying && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                        LIVE
                      </Badge>
                    )}
                  </div>

                  <div className="relative">
                    {generatedVideoUrl ? (
                      <div className="w-full aspect-square rounded-lg overflow-hidden border border-slate-200">
                        <video
                          ref={videoRef}
                          src={generatedVideoUrl}
                          className="w-full h-full object-cover"
                          autoPlay
                          onEnded={handleVideoEnded}
                          controls
                        />
                      </div>
                    ) : selectedAvatar ? (
                      <div className={`w-full aspect-square rounded-lg overflow-hidden border border-slate-200 ${isPlaying && !generatedVideoUrl ? 'animate-pulse' : ''}`}>
                        <img 
                          src={selectedAvatar.image} 
                          alt={selectedAvatar.name}
                          className="w-full h-full object-cover"
                        />
                        {isPlaying && !generatedVideoUrl && (
                          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent"></div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                        <p className="text-slate-500">Loading auctioneer...</p>
                      </div>
                    )}
                    
                    {(isGenerating || isPlaying) && (
                      <div className="absolute bottom-2 left-2">
                        <div className="flex space-x-1">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                              style={{ animationDelay: `${i * 0.1}s` }}
                            ></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {videoStatus && (
                    <div className="text-center">
                      <p className="text-sm text-blue-600">{videoStatus}</p>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Auction Progress</span>
                      <span className="text-slate-500">{Math.round(audioProgress)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${audioProgress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Start Auction Control - Desktop */}
                  <div className="space-y-3">
                    <Button
                      onClick={handleStartAuction}
                      disabled={isGenerating || !selectedAvatar}
                      className={`w-full py-3 text-lg font-semibold transition-all ${
                        isPlaying 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Starting...
                        </>
                      ) : isPlaying ? (
                        <>
                          <Pause className="w-5 h-5 mr-2" />
                          Stop Auction
                        </>
                      ) : (
                        <>
                          <Gavel className="w-5 h-5 mr-2" />
                          Start Auction
                        </>
                      )}
                    </Button>

                    <div className="flex items-center justify-center text-sm text-slate-500">
                      <Volume2 className="w-4 h-4 mr-2" />
                      {isGenerating ? 'Preparing auctioneer...' : 
                       isPlaying ? 'Auction in progress...' : 
                       'Ready to start auction'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Preload avatar image (hidden) */}
      {selectedAvatar && (
        <img 
          src={selectedAvatar.image} 
          alt="preload"
          className="hidden"
          aria-hidden="true"
        />
      )}

      {/* Fixed Small Avatar (Mobile Only - appears when scrolled) */}
      {isScrolled && selectedAvatar && (
        <div className="lg:hidden fixed bottom-4 right-4 z-50">
          <div className="relative">
            <div 
              className="rounded-full overflow-hidden border-2 border-white shadow-lg bg-white bg-cover bg-center bg-no-repeat" 
              style={{ 
                width: '150px', 
                height: '150px',
                backgroundImage: generatedVideoUrl ? 'none' : `url(${selectedAvatar.image})`
              }}
            >
              {generatedVideoUrl ? (
                <video
                  src={generatedVideoUrl}
                  className="w-full h-full object-cover rounded-full"
                  autoPlay
                  muted
                  loop
                />
              ) : null}
            </div>
            {isPlaying && (
              <div className="absolute -top-2 -right-2">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}