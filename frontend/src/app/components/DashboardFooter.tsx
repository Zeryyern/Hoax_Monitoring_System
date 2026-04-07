import { Activity, Github, Globe, Linkedin, Mail, ShieldCheck, Twitter } from 'lucide-react';

interface DashboardFooterProps {
  area: 'admin' | 'user';
}

export function DashboardFooter({ area }: DashboardFooterProps) {
  const year = new Date().getFullYear();
  const areaLabel = area === 'admin' ? 'Admin Console' : 'User Portal';
  const areaDescription =
    area === 'admin'
      ? 'Operational control center for monitoring, users, scraping and audit activity.'
      : 'Personal workspace for monitoring hoax signals and viewing analytics insights.';

  return (
    <footer className="border-t border-slate-700 bg-gradient-to-b from-slate-950 to-slate-900 px-4 sm:px-6 py-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-700/30">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">Hoax Monitoring System</p>
                <p className="text-xs text-cyan-300">{areaLabel}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{areaDescription}</p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Quick Access</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <p className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-300" />
                Real-time Monitoring
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-300" />
                Trusted 5-Source Registry
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Contact & Links</h4>
            <div className="flex flex-wrap gap-2 mb-3">
              <a
                href="https://github.com/Zeryyern"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors text-sm text-slate-300"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <a
                href="https://www.linkedin.com/in/zayyanu-awwal-054b84197"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors text-sm text-slate-300"
              >
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </a>
              <a
                href="https://twitter.com/AwwalZayyan"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors text-sm text-slate-300"
              >
                <Twitter className="w-4 h-4" />
                X
              </a>
              <a
                href="https://instagram.com/awwerl_zeryyern"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors text-sm text-slate-300"
              >
                <Globe className="w-4 h-4" />
                Website
              </a>
            </div>
            <a
              href="mailto:awwalzayyan@gmail.com"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300"
            >
              <Mail className="w-4 h-4" />
              awwalzayyan@gmail.com
            </a>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
          <p>Intelligent Hoax Monitoring and Analysis Platform</p>
          <p>Copyright © {year} All rights reserved</p>
        </div>
      </div>
    </footer>
  );
}
