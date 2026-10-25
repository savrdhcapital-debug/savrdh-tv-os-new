import './globals.css';
import './interface-studio.css';
import '../public/tv-studio/appearance-effects.css';
import './unified-appearance.css';
import AppearanceProvider from '@/components/AppearanceProvider';
export const metadata={title:'SAVRDH TV OS | Super Admin',description:'Family protection operations'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><AppearanceProvider>{children}</AppearanceProvider></body></html>}
