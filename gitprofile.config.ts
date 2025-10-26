// gitprofile.config.ts

const CONFIG = {
  github: {
    username: 'thejjw', // Your GitHub org/user name. (This is the only required config)
  },
  /**
   * If you are deploying to https://<USERNAME>.github.io/, for example your repository is at https://github.com/arifszn/arifszn.github.io, set base to '/'.
   * If you are deploying to https://<USERNAME>.github.io/<REPO_NAME>/,
   * for example your repository is at https://github.com/arifszn/portfolio, then set base to '/portfolio/'.
   */
  base: '/',
  projects: {
    github: {
      display: true, // Display GitHub projects?
      header: 'Github Projects',
      mode: 'automatic', // Mode can be: 'automatic' or 'manual'
      automatic: {
        sortBy: 'updated', // Sort projects by 'stars' or 'updated'
        limit: 8, // How many projects to display.
        exclude: {
          forks: true, // Forked projects will not be displayed if set to true.
          projects: ['thejjw/thejjw.github.io'], // These projects will not be displayed. example: ['arifszn/my-project1', 'arifszn/my-project2']
        },
      },
      manual: {
        // Properties for manually specifying projects
        projects: [''], // List of repository names to display. example: ['arifszn/my-project1', 'arifszn/my-project2']
      },
    },
    external: {
      header: 'My Projects',
      // To hide the `External Projects` section, keep it empty.
      projects: [
        {
          title: 'Link Visited Tooltip',
          description:
            'A Chrome extension that shows a tooltip on link hover indicating when a link was last visited..',
          imageUrl:
            'https://lh3.googleusercontent.com/GvV0Re9QdCKp5wgvmOTiJgKHvmZnbAkflaPFr2f0aKhsYSoqHVhLcd8ZaRiCRsLcRKoQOCme3N3npBjlqZtX8QDU=s1280-w1280-h800',
          link: 'https://chromewebstore.google.com/detail/link-visited-tooltip/eknakfmjakcfjkemkanekcakbnjfkbnc',
        },
        {
          title: 'Image Hover Save',
          description:
            'A Chrome extension that allows you to quickly save images by hovering over them..',
          imageUrl:
            'https://lh3.googleusercontent.com/nJYKUbuitdoSe6a09IqQblgh3A0NmpW4_kFEq6GwTOinxbbAzpVs2AlEoITGHErmzgiR7pH1aamQsdQKvYCZbnUFu2g=s1280-w1280-h800',
          link: 'https://chromewebstore.google.com/detail/image-hover-save/lhmljebjlhdafkminimimaokjliabegg',
        },
        {
          title: 'Cache Killer Extension',
          description:
            'A Chrome extension that disables browser cache to ensure pages always load fresh content from the server instead of using cached versions.',
          imageUrl:
            'https://lh3.googleusercontent.com/0cQ7YiJw_GI9Yz61Tjt5QnSbkPjBS6oQ5dvlP4pkhRH84zDhgIw6e-BNigMGuwg3D1vUnKdh0Y-WX84inBELvWlH=s1280-w1280-h800',
          link: 'https://chromewebstore.google.com/detail/cache-killer/jhpfoicanffigcjoogcgihhjikmcpopf',
        },
      ],
    },
  },
  seo: {
    title: 'jjw',
    description: 'Hello. This is Jaewoo Jeon. Thank you for reading my profile.',
    imageURL: '',
  },
  social: {
    linkedin: 'jaewoo-jeon',
    x: '',
    mastodon: '',
    researchGate: '',
    facebook: '',
    instagram: '',
    reddit: '',
    threads: '',
    youtube: '', // example: 'pewdiepie'
    udemy: '',
    dribbble: '',
    behance: '',
    medium: '',
    dev: '',
    stackoverflow: '', // example: '1/jeff-atwood'
    discord: '',
    telegram: '',
    website: 'https://jjw.is-a.dev',
    phone: '',
    email: '',
  },
  resume: {
    fileUrl:
      '' // 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', // Empty fileUrl will hide the `Download Resume` button.
  },
  skills: [
    'Java',
    'Python',
    'JavaScript',
    'C',
    'Go',
    'Powershell',
    'SQL',
    'Docker',
    'Rust',
    '…',
  ],
  experiences: [
    {
      company: 'Securelink',
      position: 'Manager (Engineer)',
      from: 'April 2021',
      to: 'Present',
      companyLink: 'https://www.securelink.co.kr',
    },
    {
      company: 'See LinkedIn',
      position: 'Software Engineer',
      from: 'Past',
      to: 'April 2021',
      companyLink: 'https://www.linkedin.com/in/jaewoo-jeon',
    },
  ],
  certifications: [
    {
      name: 'Structured Query Language Developer',
      body: 'Kdata (Korea Data Agency)',
      year: 'Oct 2021',
      link: 'https://www.kdata.or.kr/',
    },
    {
      name: 'Engineer, Information Security',
      body: 'KISA (Korea Internet & Security Agency)',
      year: 'Dec 2018',
      link: 'https://www.kisa.or.kr/',
    },
    {
      name: 'Engineer, Information Processing',
      body: 'HRD Korea(한국산업인력공단)',
      year: 'May 2017',
      link: 'https://www.hrdkorea.or.kr/',
    },
  ],
  educations: [
    {
      institution: 'KNOU (Korea National Open University)',
      degree: 'Master of Science in Computer Science',
      to: '2024',
    },
  ],
  publications: [
    // {
    //   title: 'Publication Title',
    //   conferenceName: '',
    //   journalName: 'Journal Name',
    //   authors: 'John Doe, Jane Smith',
    //   link: 'https://example.com',
    //   description:
    //     'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    // },
    // {
    //   title: 'Publication Title',
    //   conferenceName: 'Conference Name',
    //   journalName: '',
    //   authors: 'John Doe, Jane Smith',
    //   link: 'https://example.com',
    //   description:
    //     'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    // },
  ],
  // Display articles from your medium or dev account. (Optional)
  blog: {
    source: 'dev', // medium | dev
    username: '', // 'arifszn', // to hide blog section, keep it empty
    limit: 2, // How many articles to display. Max is 10.
  },
  googleAnalytics: {
    id: 'G-MYJ9MMZJLT', // GA3 tracking id/GA4 tag id UA-XXXXXXXXX-X | G-XXXXXXXXXX
  },
  // Track visitor interaction and behavior. https://www.hotjar.com
  hotjar: { id: '', snippetVersion: 6 },
  themeConfig: {
    defaultTheme: 'night',

    // Hides the switch in the navbar
    // Useful if you want to support a single color mode
    disableSwitch: false,

    // Should use the prefers-color-scheme media-query,
    // using user system preferences, instead of the hardcoded defaultTheme
    respectPrefersColorScheme: false,

    // Display the ring in Profile picture
    displayAvatarRing: true,

    // Available themes. To remove any theme, exclude from here.
    themes: [
      'light',
      'dark',
      'cupcake',
      'bumblebee',
      'emerald',
      'corporate',
      'synthwave',
      'retro',
      'cyberpunk',
      'valentine',
      'halloween',
      'garden',
      'forest',
      'aqua',
      'lofi',
      'pastel',
      'fantasy',
      'wireframe',
      'black',
      'luxury',
      'dracula',
      'cmyk',
      'autumn',
      'business',
      'acid',
      'lemonade',
      'night',
      'coffee',
      'winter',
      'dim',
      'nord',
      'sunset',
      'caramellatte',
      'abyss',
      'silk',
      'procyon',
    ],
  },

  // Optional Footer. Supports plain text or HTML.
  footer: `<span>page based on GitProfile(@arifszn/gitprofile). @thejjw 2025-2025</span><br><span><a href="./tool/compression-comparison-tool.html">tool 1: Compression Tool</a> • <a href="./tool/jpegxl-converter.html">tool 2: JPEG XL Converter</a></span> • <span><a href="./tool/jpegxl-target-size.html">tool 3: JPEG XL Target Size</a></span><br><span><a href="./tool/ffmpeg-browser-transcoder.html">tool 4: FFmpeg Transcoder</a></span>`,

  enablePWA: false,
};

export default CONFIG;
