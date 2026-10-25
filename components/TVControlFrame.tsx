'use client';

import {useEffect, useRef, useState} from 'react';

type Props = {tab?: 'studio' | 'releases'; simulatorOnly?: boolean};

export default function TVControlFrame({tab = 'studio', simulatorOnly = false}: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(simulatorOnly ? 680 : 1100);
  const [frameDocument,setFrameDocument] = useState('');
  useEffect(()=>{let live=true;fetch('/tv-studio/admin.html').then(response=>response.text()).then(html=>{if(live){const base=new URL('/tv-studio/',window.location.origin).href;const parameters=`?embedded=1&tab=${tab}${simulatorOnly?'&simulator=1':''}`;setFrameDocument(html.replace('<head>',`<head><base href="${base}"><script>window.studioParameters=${JSON.stringify(parameters)};<\/script>`));}});return()=>{live=false};},[tab,simulatorOnly]);

  useEffect(() => {
    function resize(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type !== 'tv-studio:resize' || !Number.isFinite(event.data.height)) return;
      setHeight(Math.max(360, Math.min(4200, event.data.height + 12)));
    }
    window.addEventListener('message', resize);
    return () => window.removeEventListener('message', resize);
  }, []);


  return <iframe ref={frame} srcDoc={frameDocument} title={simulatorOnly ? 'Android TV interactive simulator' : 'TV themes and application releases'}
    allow="fullscreen" style={{width:'100%', height, border:0, display:'block', borderRadius:14, background:'#080d15'}} />;
}
