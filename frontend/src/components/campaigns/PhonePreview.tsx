'use client';

import { useMemo } from 'react';
import {
  ChevronLeft,
  Phone,
  Video,
  MoreVertical,
  Send,
  Wifi,
  Signal,
  Battery,
  Mail,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhonePreviewProps {
  message: string;
  channel: string;
  className?: string;
}

export function PhonePreview({ message, channel, className }: PhonePreviewProps) {
  // Parse template variables with realistic sample data
  const parsedMessage = useMemo(() => {
    if (!message) return 'Type a message to see a preview...';
    return message
      .replace(/\{\{\s*name\s*\}\}/g, 'Rajesh')
      .replace(/\{\{\s*city\s*\}\}/g, 'Mumbai')
      .replace(/\{\{\s*total_spend\s*\}\}/g, '₹12,450')
      .replace(/\{\{\s*last_order\s*\}\}/g, '3 days ago');
  }, [message]);

  const currentTime = useMemo(() => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }, []);

  return (
    <div className={cn('flex flex-col items-center justify-center py-4', className)}>
      {/* Device Frame */}
      <div className="relative mx-auto h-[620px] w-[300px] rounded-[40px] border-[10px] border-zinc-900 bg-zinc-950 shadow-2xl ring-1 ring-zinc-900/10 dark:ring-white/10 overflow-hidden">
        {/* Notch / Dynamic Island */}
        <div className="absolute left-1/2 top-3 z-50 h-5 w-24 -translate-x-1/2 rounded-full bg-zinc-900" />

        {/* Status Bar */}
        <div className="flex h-11 items-end justify-between px-6 pb-1 text-[11px] font-semibold text-zinc-800 dark:text-zinc-300 z-40 relative">
          <span>{currentTime}</span>
          <div className="flex items-center gap-1.5">
            <Signal size={10} className="stroke-[2.5]" />
            <Wifi size={10} className="stroke-[2.5]" />
            <Battery size={12} className="stroke-[2.5]" />
          </div>
        </div>

        {/* Screen Content */}
        <div className="relative h-[calc(100%-44px)] w-full overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex flex-col">
          {/* Channel Rendering */}

          {/* 1. WHATSAPP PREVIEW */}
          {channel === 'whatsapp' && (
            <div className="flex flex-1 flex-col bg-[#efeae2] dark:bg-[#0b141a] h-full text-zinc-900 dark:text-zinc-100">
              {/* WA Header */}
              <div className="flex h-12 items-center gap-2 bg-[#075e54] dark:bg-[#1f2c34] px-2 text-white shadow-sm z-10 shrink-0">
                <ChevronLeft size={18} className="cursor-pointer" />
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700">
                  B
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate leading-tight">BrewCo Campaign</p>
                  <p className="text-[9px] text-zinc-200 font-medium leading-none">Online</p>
                </div>
                <div className="flex items-center gap-3 text-zinc-100">
                  <Video size={14} />
                  <Phone size={13} />
                  <MoreVertical size={14} />
                </div>
              </div>

              {/* WA Chat Body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                <div className="mx-auto my-1 rounded bg-[#e1f3fc] dark:bg-[#182229] px-2.5 py-1 text-[10px] text-zinc-600 dark:text-zinc-400 font-medium shadow-sm w-fit max-w-[80%] text-center uppercase tracking-wider">
                  Today
                </div>

                <div className="relative max-w-[85%] rounded-lg rounded-tl-none bg-white dark:bg-[#1f2c34] p-2.5 text-xs text-zinc-800 dark:text-zinc-100 shadow-sm border border-zinc-100/50 dark:border-zinc-800/50 self-start float-left">
                  <span className="whitespace-pre-wrap font-sans break-words">{parsedMessage}</span>
                  <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-zinc-400 dark:text-zinc-500 float-right">
                    <span>{currentTime}</span>
                  </div>
                </div>
              </div>

              {/* WA Footer */}
              <div className="bg-[#f0f0f0] dark:bg-[#1f2c34] p-2 flex items-center gap-2 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                <div className="flex-1 rounded-full bg-white dark:bg-[#2a3942] px-3 py-1.5 text-xs text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-800">
                  Message
                </div>
                <div className="h-8 w-8 rounded-full bg-[#00a884] flex items-center justify-center text-white shrink-0 shadow-md">
                  <Send size={12} className="ml-0.5" />
                </div>
              </div>
            </div>
          )}

          {/* 2. SMS / RCS PREVIEW */}
          {(channel === 'sms' || channel === 'rcs') && (
            <div className="flex flex-1 flex-col bg-white dark:bg-zinc-950 h-full text-zinc-900 dark:text-zinc-100">
              {/* SMS Header */}
              <div className="flex h-12 flex-col items-center justify-center border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 shrink-0">
                <div className="flex items-center w-full justify-between">
                  <ChevronLeft size={16} className="text-blue-500" />
                  <div className="flex flex-col items-center">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                      B
                    </div>
                    <p className="text-[10px] font-semibold mt-0.5 text-zinc-800 dark:text-zinc-200">BrewCo</p>
                  </div>
                  <span className="text-xs text-blue-500 font-medium">Info</span>
                </div>
              </div>

              {/* SMS Chat Body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <div className="text-center text-[10px] text-zinc-400 dark:text-zinc-600 font-medium">
                  {channel === 'rcs' ? 'RCS Chat' : 'Text Message'}
                </div>

                <div className="relative max-w-[80%] rounded-2xl rounded-tl-sm bg-[#e9e9eb] dark:bg-[#262629] px-3 py-2 text-xs text-zinc-800 dark:text-zinc-100 self-start float-left font-sans break-words whitespace-pre-wrap">
                  {parsedMessage}
                </div>
              </div>

              {/* SMS Footer */}
              <div className="p-2 border-t border-zinc-100 dark:border-zinc-900 flex items-center gap-2 shrink-0 bg-zinc-50 dark:bg-zinc-900">
                <div className="flex-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400 dark:text-zinc-600">
                  {channel === 'rcs' ? 'RCS Message' : 'Text Message'}
                </div>
                <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                  <Send size={11} />
                </div>
              </div>
            </div>
          )}

          {/* 3. EMAIL PREVIEW */}
          {channel === 'email' && (
            <div className="flex flex-1 flex-col bg-white dark:bg-zinc-950 h-full text-zinc-900 dark:text-zinc-100">
              {/* Mail Header */}
              <div className="flex h-12 items-center gap-2 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900 px-3 shrink-0">
                <ChevronLeft size={16} className="text-blue-500" />
                <Mail size={14} className="text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Inbox</span>
              </div>

              {/* Mail Envelope Details */}
              <div className="p-3 border-b border-zinc-100 dark:border-zinc-900 space-y-1.5 text-[11px] bg-white dark:bg-zinc-950 shrink-0">
                <div className="flex">
                  <span className="w-10 text-zinc-400">From:</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">BrewCo &lt;campaigns@brewco.in&gt;</span>
                </div>
                <div className="flex">
                  <span className="w-10 text-zinc-400">To:</span>
                  <span className="text-zinc-600 dark:text-zinc-400">customer@email.com</span>
                </div>
                <div className="flex">
                  <span className="w-10 text-zinc-400">Subject:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">Exclusive BrewCo Offer Inside</span>
                </div>
              </div>

              {/* Mail Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/30">
                {/* Simulated Email Template Wrapper */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-md p-3.5 shadow-sm space-y-4 text-xs">
                  {/* Brand Banner */}
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <span className="font-bold tracking-tight text-zinc-800 dark:text-zinc-200 text-sm">BrewCo.</span>
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold">Special Offer</span>
                  </div>

                  <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans break-words">{parsedMessage}</p>

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-[10px] text-zinc-400">
                    <span>BrewCo Premium Coffee Chain</span>
                    <span>Unsubscribe</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. DEFAULT PREVIEW */}
          {!channel && (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center h-full bg-zinc-50 dark:bg-zinc-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mb-3">
                <Sparkles size={20} />
              </div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">No Channel Selected</p>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-[80%]">Please select a campaign channel to view the real-time mobile preview.</p>
            </div>
          )}

        </div>
      </div>
      <span className="text-[10px] text-zinc-400 mt-2 font-medium">Real-Time Mobile Mockup Preview</span>
    </div>
  );
}
