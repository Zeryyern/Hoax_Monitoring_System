import { Github, Globe, Linkedin, Mail, Twitter } from 'lucide-react';

const socialLinks = [
  { label: 'Website', href: 'https://instagram.com/awwerl_zeryyern', icon: Globe },
  { label: 'X', href: 'https://twitter.com/AwwalZayyan', icon: Twitter },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/zayyanu-awwal-054b84197', icon: Linkedin },
  { label: 'GitHub', href: 'https://github.com/Zeryyern', icon: Github },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-700 bg-slate-950 text-slate-300 mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-2">Hoax Monitoring System</h3>
            <p className="text-sm text-slate-400">
              Professional misinformation monitoring, source tracking, and hoax classification platform.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-2">Platform</h4>
            <ul className="space-y-1 text-sm text-slate-400">
              <li>Real-time Hoax Detection</li>
              <li>Multi-Source Scraping</li>
              <li>Admin Analytics Dashboard</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-2">Connect</h4>
            <div className="flex flex-wrap gap-2 mb-3">
              {socialLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors text-sm"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </div>
            <a href="mailto:awwalzayyan@gmail.com" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300">
              <Mail className="w-4 h-4" />
              awwalzayyan@gmail.com
            </a>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-slate-500 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <p>Intelligent Hoax Monitoring and Analysis System</p>
          <p>Copyright © 2026 All rights reserved</p>
        </div>
      </div>
    </footer>
  );
}

