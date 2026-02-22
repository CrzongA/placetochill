"use client"
import { useEffect, useState } from 'react';

interface SocialEmbedProps {
    url: string;
}

// ─── Shared loader ────────────────────────────────────────────────────────────
// Uses a data attribute to distinguish "tag exists but still loading" from
// "tag exists and already executed" so we don't call onLoad too early.

function loadScript(src: string, onLoad: () => void, onError: () => void) {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
        if (existing.dataset.loaded) {
            onLoad();
        } else if (existing.dataset.error) {
            onError();
        } else {
            existing.addEventListener('load', onLoad, { once: true });
            existing.addEventListener('error', onError, { once: true });
        }
    } else {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => {
            script.dataset.loaded = 'true';
            onLoad();
        };
        script.onerror = () => {
            script.dataset.error = 'true';
            onError();
        };
        document.body.appendChild(script);
    }
}

function FallbackLink({ url }: { url: string }) {
    return (
        <div className="p-4 text-center">
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-400 underline">
                View on Social Media
            </a>
        </div>
    );
}

// ─── Instagram (blockquote + embed.js) ───────────────────────────────────────
// Direct iframes are blocked by Instagram's X-Frame-Options: deny.
// Their embed.js SDK replaces the blockquote with its own sandboxed iframe.

const INSTAGRAM_SCRIPT_SRC = 'https://www.instagram.com/embed.js';

function InstagramEmbed({ url }: { url: string }) {
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
    const permalink = url.split('?')[0].replace(/\/$/, '');

    useEffect(() => {
        loadScript(
            INSTAGRAM_SCRIPT_SRC,
            () => {
                (window as any).instgrm?.Embeds?.process?.();
                setState('ready');
            },
            () => setState('error'),
        );
    }, [permalink]);

    if (state === 'error') return <FallbackLink url={url} />;

    return (
        <div className="w-full rounded-xl overflow-hidden bg-black/20 relative">
            {state === 'loading' && (
                <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
                </div>
            )}
            <blockquote
                className="instagram-media"
                data-instgrm-captioned
                data-instgrm-permalink={`${permalink}/`}
                data-instgrm-version="14"
                style={{ margin: '0 auto', width: '100%' }}
            />
        </div>
    );
}

// ─── Threads (blockquote + embed.js SDK) ─────────────────────────────────────

const THREADS_SCRIPT_SRC = 'https://www.threads.net/embed.js';

function ThreadsEmbed({ url }: { url: string }) {
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
    const permalink = url.split('?')[0].replace(/\/$/, '');

    useEffect(() => {
        loadScript(
            THREADS_SCRIPT_SRC,
            () => {
                (window as any).Threads?.EmbedSDK?.reload?.();
                setState('ready');
            },
            () => setState('error'),
        );
    }, [permalink]);

    if (state === 'error') return <FallbackLink url={url} />;

    return (
        <div className="w-full rounded-xl overflow-hidden bg-black/20 relative">
            {state === 'loading' && (
                <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
                </div>
            )}
            <blockquote
                className="text-post-media"
                data-text-post-permalink={permalink}
                data-text-post-version="0"
            />
        </div>
    );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default function SocialEmbed({ url }: SocialEmbedProps) {
    if (!url) return null;

    if (url.includes('instagram.com')) {
        return <InstagramEmbed url={url} />;
    }

    if (url.includes('threads.com') || url.includes('threads.net')) {
        return <ThreadsEmbed url={url} />;
    }

    return <FallbackLink url={url} />;
}
