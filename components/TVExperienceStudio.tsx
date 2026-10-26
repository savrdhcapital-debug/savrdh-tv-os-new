import Link from 'next/link';
import ApplicationDownloads from './ApplicationDownloads';
import TVControlFrame from './TVControlFrame';

export default function TVExperienceStudio({initialTab = 'studio'}: {initialTab?: 'studio' | 'releases'}) {
  return <main className="page">
    <div className="heading"><div>
      <div className="eyebrow">SUPER ADMIN / ANDROID TV</div>
      <h1>{initialTab === 'releases' ? 'App & OS Updates' : 'TV Experience Studio'}</h1>
      <p>Ten TV themes, remote simulator and application releases in your existing control center.</p>
    </div><span className="demo-tag">Same interface as Android app</span></div>
    {initialTab === 'releases' ? <ApplicationDownloads/> : <p><Link className="back-link" href="/modules/updates">Download TV and Mobile Remote APKs in App & OS Updates →</Link></p>}
    <Link className="back-link" href="/modules/appearance">Edit global colors, fonts, logo and background motion in Appearance Studio →</Link><TVControlFrame tab={initialTab}/>
  </main>;
}
