/*
 * i18n
 * ─────────────────────────────────────────────────────────────
 * Русский — язык по умолчанию: тексты с атрибутом data-i18n берутся
 * прямо из разметки index.html (их не нужно дублировать здесь).
 * Чтобы добавить/поправить перевод — меняй словарь EN ниже.
 * Строки, которые создаёт JS (терминал, панель навыков, тосты),
 * лежат в STRINGS для обоих языков.
 */
window.I18N = {
  en: {
    'nav.about': 'about',
    'nav.projects': 'projects',
    'nav.experience': 'experience',
    'nav.skills': 'stack',
    'nav.contact': 'contact',
    'hero.scroll': 'scroll',

    'about.title': 'About',
    'about.manifest': 'I’m Vika. A 3rd-year student. I make interfaces that feel good to touch — and I’m learning what happens underneath them, which is why I’m gradually moving towards backend.',
    'about.f1k': 'year',
    'about.f1d': 'college, year 3 of 4',
    'about.f2k': 'confident',
    'about.f2d': 'the foundation everything else stands on',
    'about.f3k': 'learning now',
    'about.f3d': 'Java Developer course by Skillbox',
    'about.f4k': 'direction',
    'about.f4d': 'from interfaces to how things work inside',

    'projects.title': 'Projects',
    'buggy.lead': 'Website for a company that runs buggy, ATV and enduro tours.',
    'buggy.m1': 'Tours', 'buggy.m2': 'Prices', 'buggy.m3': 'Contacts', 'buggy.m4': 'Book',
    'buggy.m5': 'Buggy tours<br/>in the mountains',
    'buggy.m6': 'Book a tour →',
    'buggy.c1': 'Buggy', 'buggy.c2': 'ATV', 'buggy.c3': 'Enduro',
    'buggy.m7': 'Send',
    'buggy.cap': '* schematic before / after illustration, not a screenshot',
    'buggy.cap2': '* real screenshots of the site · hover the window — the home page scrolls through',
    'buggy.ctxK': 'context',
    'buggy.ctx': 'I received an existing but rough website. On my own, I substantially reworked it and brought it to a complete, polished state.',
    'buggy.didK': 'what I did',
    'buggy.d1': 'interface & visuals',
    'buggy.d2': 'pages & components',
    'buggy.d3': 'responsive / mobile layout',
    'buggy.d4': 'content & overall frontend polish',
    'buggy.alsoK': 'also in the project',
    'buggy.a1': 'booking forms',
    'buggy.a2': 'SEO pages',
    'buggy.a3': 'lead submission integration',
    'buggy.honest': '// honestly: the project existed before me, and not all of it is my work (deployment included). My part is a major frontend rework.',

    'varg.lead': 'An experimental one-page website about the Stark VARG. Fully my own small project.',
    'varg.feat': 'The key feature is a cinematic scroll: as you scroll, motorcycle scenes replace each other like film frames. Here are the real frames from the site — they change on their own.',

    'geo.lead': 'An experimental app with an interactive map: places, notes, categories and routes.',
    'geo.search': 'search a place…',
    'geo.route': 'build route',
    'geo.cat1': 'food', 'geo.cat2': 'nature', 'geo.cat3': 'culture',
    'geo.f1': 'place search',
    'geo.f2': 'custom points',
    'geo.f3': 'notes',
    'geo.f4': 'categories',
    'geo.f5': 'route building',
    'geo.f6': 'saving geodata',
    'geo.honest': '// a self-directed learning project. Not production-ready — a sandbox to understand backend and geodata.',

    'wc.lead': 'A web app for learning foreign words — already live online.',
    'wc.f1': 'accounts', 'wc.f2': 'word sets', 'wc.f3': 'flashcards', 'wc.f4': 'practice', 'wc.f5': 'progress', 'wc.f6': 'spaced repetition',
    'wc.honest': '// brought to a working version and deployed on Vercel.',
    'wc.demo': 'demo widget',
    'wc.tap': 'tap the card',
    'wc.recall': 'recall the translation',
    'wc.answer': 'answer',
    "wc.again": "don't know",
    'wc.know': 'got it',

    'exp.title': 'Experience',
    'exp.tag': 'teams & existing code',
    'exp.intro': 'Real work in teams and inside other people’s existing systems. Honest about where I was the author and where I was a participant.',
    'exp.t1': 'A large corporate application that existed before me. My tasks were mostly small frontend fixes:',
    'exp.t1a': 'fixing UI bugs', 'exp.t1b': 'element positioning', 'exp.t1c': 'buttons', 'exp.t1d': 'small interface changes',
    'exp.exposure': 'project stack · exposure',
    'exp.t1h': '// the portal was built by the team — I’m not its author.',
    'exp.t2': 'Participation in the project during my internship: getting to know real team development and its processes.',
    'exp.t2h': '// the website and backend were not built by me.',
    'exp.t2s': 'Website of an engineering company from Saint Petersburg: gas supply, boiler houses and utility networks. Services, projects, news, questionnaires and request forms.',
    'exp.t2hint': 'hover the window — the page scrolls',
    'exp.t3t': 'Krasnodar Region Motorcycle Sport Federation',
    'exp.t3': 'Working with an existing website: publishing and updating news and content.',
    'exp.t3h': '// the website development is not my work.',
    'exp.t3s': 'The federation’s official website: news, motocross and motoball race calendar, documents, media and partners.',

    'skills.title': 'Stack',
    'skills.tag': 'no percentages — just the truth',
    'skills.l1': 'confident',
    'skills.l2': 'used in projects',
    'skills.l3': 'learning now',
    'skills.hint': 'hover a technology to see where it was used',

    'edu.title': 'Education',
    'edu.k1': 'college', 'edu.k2': 'course', 'edu.k3': 'course', 'edu.k4': 'course',
    'edu.v3': 'Skillbox — Java Developer · 8 months',
    'edu.v4': 'Skillbox — Machine Learning Engineer · 12 months',
    'edu.v1': 'College — programming',
    'edu.v2': 'MTI — “Python for Beginners” · 100 hours',
    'edu.s1': 'year 3 of 4',
    'edu.s2': 'certificate',
    'edu.s3': 'in progress',

    'contact.k': 'contact',
    'contact.sub': 'Open to work and to any new projects — web, backend and beyond. Drop me a line — I’ll reply.',

    'catx.play': 'run live',
    'catx.lead': 'A just-for-fun project: a dark interactive “let’s get coffee” website. The hero is a black cat with emerald eyes, drawn entirely in code.',
    'catx.f1': 'eyes follow your cursor',
    'catx.f2': 'the cat blinks, breathes, twitches its ears',
    'catx.f3': 'the “camera” flies into its eyes on scroll',
    'catx.f4': 'a runaway “NO” button and easter eggs',
    'live.site': 'open the live site',
    'live.run': 'run the live version',
    'live.open': 'new tab',
    'live.hint': 'if the site didn’t load — open it in a new tab ↗'
  },

  // Строки, которые генерирует JS
  STRINGS: {
    ru: {
      intro: ['> initializing…', '> loading projects…', '> mounting curiosity.module', '> welcome.'],
      term: {
        whoami: 'vika — начинающий web / backend developer\nстудентка колледжа\n3 курс из 4',
        core: 'python   html   css\n\n# то, на чём я пишу уверенно',
        used: 'javascript  react\njava  kotlin\nflask  sql  git\n\n# работала с этим в проектах и учёбе',
        now: '→ учу java (skillbox · java developer)\n→ разбираюсь в backend-архитектуре\n→ двигаюсь от web к backend',
        honest: '→ готова изучать новое и разбираться в сложном\n→ умею работать с ИИ-инструментами в разработке\n→ хочу расти в backend: java, spring, базы данных\n→ открыта к стажировке и первой работе в команде'
      },
      groups: { core: 'core · уверенно', used: 'worked with · в проектах', explore: 'exploring · изучаю' },
      usedIn: 'где встречалась',
      copied: 'email скопирован ✓',
      geoRoute: 'маршрут построен · 4.2 км · 52 мин',
      geoRouteBtn: 'построить маршрут',
      geoClear: 'сбросить маршрут',
      wcNext: ['повтор через 10 мин', 'повтор через 3 дня'],
      wcDone: 'набор пройден ✓',
      wipe: 'loading'
    },
    en: {
      intro: ['> initializing…', '> loading projects…', '> mounting curiosity.module', '> welcome.'],
      term: {
        whoami: 'vika — junior web / backend developer\ncollege student\nyear 3 of 4',
        core: 'python   html   css\n\n# what I write with confidence',
        used: 'javascript  react\njava  kotlin\nflask  sql  git\n\n# used in projects and studies',
        now: '→ learning java (skillbox · java developer)\n→ digging into backend architecture\n→ moving from web towards backend',
        honest: '→ ready to learn new things and dig into hard ones\n→ know how to use AI tools in development\n→ want to grow in backend: java, spring, databases\n→ open to an internship and a first job in a team'
      },
      groups: { core: 'core · confident', used: 'worked with · in projects', explore: 'exploring · learning' },
      usedIn: 'where it was used',
      copied: 'email copied ✓',
      geoRoute: 'route built · 4.2 km · 52 min',
      geoRouteBtn: 'build route',
      geoClear: 'clear route',
      wcNext: ['next review in 10 min', 'next review in 3 days'],
      wcDone: 'set complete ✓',
      wipe: 'loading'
    }
  }
};
