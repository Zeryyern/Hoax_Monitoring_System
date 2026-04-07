import { useEffect, useMemo, useRef, useState } from 'react';
import { Shield, Zap, Users, BarChart3, Check, ArrowRight, Github, Mail, Linkedin, ChevronLeft, ChevronRight, GraduationCap, Layers } from 'lucide-react';

interface AboutPageProps {
  onNavigate?: (page: string) => void;
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  const slides = useMemo(
    () => [
      {
        key: 'designer',
        name: 'Zayyanu Awwal',
        subtitle: 'Mahasiswa Informatika Universitas Sebelas Maret',
        role: 'System Designer and Architect',
        tagline: 'System designer, architecture, and end-to-end implementation.',
        highlights: [
          'System architecture and database design',
          'Scraper pipeline engineering and data quality rules',
          'API design and dashboard UX implementation',
          'Deployment and operational monitoring',
        ],
        imageSrc: '/team/Zayyanu_Awwal.jpg',
        fallbackSrc: '/team/system-designer.svg',
        accent: 'from-cyan-500/20 to-blue-500/10',
        icon: Layers,
      },
      {
        key: 'supervisor',
        name: 'Yudho Yudhanto S.Kom, M.Kom',
        subtitle: 'Dosen UNS, Founder Biptek Indonesia',
        role: 'Supervising Project Lecturer',
        tagline: 'Supervision, methodology guidance, and project evaluation.',
        highlights: [
          'Research direction and project scope validation',
          'Methodology review and quality assurance checkpoints',
          'Academic supervision and progress evaluation',
          'Final review of deliverables and documentation',
        ],
        imageSrc: '/team/Yudho_Yudhanto.jpg',
        fallbackSrc: '/team/supervisor.svg',
        accent: 'from-emerald-500/15 to-cyan-500/10',
        icon: GraduationCap,
      },
    ],
    []
  );

  const [activeSlide, setActiveSlide] = useState(0);
  const [slideVisible, setSlideVisible] = useState(true);
  const fadeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setSlideVisible(false);
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = window.setTimeout(() => {
        setActiveSlide((prev) => (prev + 1) % slides.length);
        setSlideVisible(true);
      }, 220);
    }, 9000);
    return () => {
      clearInterval(timer);
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    };
  }, [slides.length]);

  const current = slides[activeSlide] ?? slides[0];
  const CurrentIcon = current.icon;

  const goToSlide = (idx: number) => {
    const next = ((idx % slides.length) + slides.length) % slides.length;
    setSlideVisible(false);
    if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = window.setTimeout(() => {
      setActiveSlide(next);
      setSlideVisible(true);
    }, 180);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-20 border-b border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900 overflow-hidden relative">
        <div className="absolute top-10 left-20 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 right-10 w-72 h-72 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            About the <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Hoax Monitoring System</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Fighting misinformation with real-time monitoring, source tracking, and professional classification workflows.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-b border-slate-700">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Our Mission & Vision</h2>
              <p className="text-slate-300 mb-4 leading-relaxed">
                In an era of rapid information spread, misinformation can cause real harm to individuals and society. Our mission is to empower users with intelligent tools to identify and combat hoaxes in real-time.
              </p>
              <p className="text-slate-300 mb-4 leading-relaxed">
                We combine hoax source scraping, fact-checking databases, and structured classification to provide actionable insights about the content you consume.
              </p>
              <p className="text-slate-300 mb-4 leading-relaxed">
                Our vision is a more informed digital ecosystem where verification is fast, transparent, and accessible to everyone.
              </p>
              <p className="text-slate-300 leading-relaxed">
                By combining technology with trusted information sources, we help foster a more informed and truthful digital ecosystem.
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-lg p-8">
              <Shield className="w-16 h-16 text-blue-400 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">Truthful Information</h3>
              <p className="text-slate-300">
                Our goal is simple: help you identify factual information and protect yourself from misleading or false content in the digital age.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Explainer Video */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-b border-slate-700">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">Why Fake News Matters</h2>
              <p className="text-slate-300 mt-3 max-w-2xl leading-relaxed">
                A short explainer video to introduce what fake news is and practical tips for spotting misinformation.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-xl">
            <div className="aspect-video w-full bg-black/20">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/D0Cd9-eJ-No"
                title="What is fake news? Tips For Spotting Them - Fake News for Kids"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center">Our Technology</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'Classification Engine',
                description: 'Automated classification workflows detect hoax patterns, linguistic inconsistencies, and suspicious content indicators.',
                color: 'from-blue-600 to-cyan-600'
              },
              {
                icon: BarChart3,
                title: 'Real-Time Analysis',
                description: 'Process news articles quickly with NLP processing to calculate confidence scores and categorize content accuracy.',
                color: 'from-green-600 to-emerald-600'
              },
              {
                icon: Users,
                title: 'Verified Sources',
                description: 'Aggregated data from 5 dedicated hoax-monitoring sources for comparison and validation.',
                color: 'from-purple-600 to-pink-600'
              }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-8 hover:border-slate-600 transition-all hover:scale-105">
                  <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-slate-400">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-b border-slate-700">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center">What Makes Us Different</h2>
          
          <div className="space-y-6">
            {[
              {
                title: '95%+ Accuracy',
                description: 'Our classification workflow is tuned to separate hoaxes versus legitimate news articles with clear confidence output.'
              },
              {
                title: 'Real-Time Monitoring',
                description: 'Continuous analysis of trending topics and new articles to catch emerging misinformation patterns immediately.'
              },
              {
                title: 'Transparent Methodology',
                description: 'Clear confidence scores, detailed reasoning, and source citations allow you to understand our analysis.'
              },
              {
                title: 'Multi-Language Support',
                description: 'Processing and analyzing content in multiple languages including Indonesian, English, and others.'
              },
              {
                title: 'Category Analysis',
                description: 'Specialized detection for politics, health, economy, disaster, technology, law, and sports sectors.'
              },
              {
                title: 'No Bias, All Data',
                description: 'Comprehensive analysis across all news sources and topics without political or commercial bias.'
              }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 p-6 bg-gradient-to-r from-slate-800/50 to-slate-800/30 border border-slate-700 rounded-lg hover:border-blue-500/30 transition-all">
                <Check className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Built with Trust & Expertise</h2>
          <p className="text-slate-300 mb-12">
            This project is developed with clear roles and academic supervision to keep the system accurate, maintainable, and professionally structured.
          </p>

          <div className="relative max-w-xl mx-auto">
            <div className={`transition-all duration-500 ease-out ${slideVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
              <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-cyan-400/45 via-slate-500/15 to-emerald-400/35 shadow-[0_28px_90px_-50px_rgba(34,211,238,0.55)]">
                <div className="relative overflow-hidden rounded-3xl bg-slate-950/35 backdrop-blur-xl border border-white/5">
                  <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl" />
                  <div className="absolute -bottom-28 -right-28 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" />
                  <div className={`absolute inset-0 bg-gradient-to-br ${current.accent} opacity-60`} />

                  <div className="relative p-7 sm:p-9">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <img
                      src={current.imageSrc}
                      alt={current.name}
                      onError={(e) => {
                        const img = e.currentTarget;
                        const fb = (current as any).fallbackSrc as string | undefined;
                        if (fb && img.src && !img.src.endsWith(fb)) img.src = fb;
                      }}
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border border-white/10 shadow-[0_18px_60px_-25px_rgba(0,0,0,0.75)] ring-2 ring-cyan-400/20"
                      loading="lazy"
                    />
                    <div className="absolute -bottom-2 -right-2 w-11 h-11 rounded-2xl bg-slate-900/85 border border-slate-700 flex items-center justify-center shadow-lg">
                      <CurrentIcon className="w-5 h-5 text-cyan-300" />
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{current.name}</h3>
                  {'subtitle' in current && (current as any).subtitle ? (
                    <p className="mt-2 text-sm text-slate-200/80">{(current as any).subtitle}</p>
                  ) : null}
                  <p className="mt-3 text-sm sm:text-base font-semibold text-cyan-200">{current.role}</p>
                  <p className="mt-4 text-slate-100/90 leading-relaxed">{current.tagline}</p>
                </div>

                <div className="mt-7 grid grid-cols-1 gap-3 text-left">
                  {current.highlights.map((h) => (
                    <div key={h} className="flex items-start gap-3 p-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition">
                      <div className="mt-0.5 w-8 h-8 rounded-xl bg-slate-900/40 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-emerald-300" />
                      </div>
                      <p className="text-sm text-slate-100/90 leading-snug">{h}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex items-center justify-center gap-2">
                  {slides.map((s, idx) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => goToSlide(idx)}
                      className={`h-2.5 rounded-full transition-all ${idx === activeSlide ? 'w-10 bg-cyan-300 shadow-[0_0_0_6px_rgba(34,211,238,0.12)]' : 'w-2.5 bg-slate-600 hover:bg-slate-500'}`}
                      aria-label={`Go to ${s.role}`}
                    />
                  ))}
                </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => goToSlide(activeSlide - 1)}
              className="hidden sm:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 rounded-2xl border border-white/10 bg-slate-950/40 backdrop-blur-md text-slate-100 hover:bg-slate-950/60 transition shadow-[0_18px_50px_-28px_rgba(0,0,0,0.85)]"
              aria-label="Previous profile"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => goToSlide(activeSlide + 1)}
              className="hidden sm:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-12 h-12 rounded-2xl border border-white/10 bg-slate-950/40 backdrop-blur-md text-slate-100 hover:bg-slate-950/60 transition shadow-[0_18px_50px_-28px_rgba(0,0,0,0.85)]"
              aria-label="Next profile"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-b border-slate-700">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { number: '5', label: 'Hoax Sources' },
              { number: '89K+', label: 'Articles Analyzed' },
              { number: '95%', label: 'Accuracy Rate' },
              { number: '2K+', label: 'Active Users' }
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <p className="text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-14 md:py-20 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-t border-slate-700">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Join Us?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Start detecting misinformation today and make a difference in your community.
          </p>
          <button
            onClick={() => onNavigate?.('signup')}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg border border-blue-400/30 hover:from-blue-500 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2 mx-auto"
          >
            Get Started <ArrowRight className="ml-2 w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Contact Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-t border-slate-700">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Have Questions?</h2>
          <p className="text-slate-300 mb-8">
            We're here to help. Get in touch with our team for more information about our system, features, or partnerships.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:awwalzayyan@gmail.com"
              className="px-6 py-3 border border-slate-600 text-white hover:bg-slate-800 font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 justify-center"
            >
              <Mail className="mr-2 w-4 h-4" />
              awwalzayyan@gmail.com
            </a>
            <a
              href="https://github.com/Zeryyern"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 border border-slate-600 text-white hover:bg-slate-800 font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 justify-center"
            >
              <Github className="mr-2 w-4 h-4" />
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/zayyanu-awwal-054b84197"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 border border-slate-600 text-white hover:bg-slate-800 font-semibold rounded-lg transition-all duration-300 flex items-center gap-2 justify-center"
            >
              <Linkedin className="mr-2 w-4 h-4" />
              LinkedIn
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-700 bg-slate-900 text-slate-400 text-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center flex-col md:flex-row gap-4">
          <p>&copy; 2024 Hoax Monitoring System. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="/" className="hover:text-slate-200">Home</a>
            <a href="#" className="hover:text-slate-200">Privacy</a>
            <a href="#" className="hover:text-slate-200">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}


