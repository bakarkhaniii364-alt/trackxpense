/**
 * Time-of-day and context-aware greeting generators for the Dashboard and RabbAi.
 */

type TimeBucket = 'morning' | 'afternoon' | 'evening' | 'night';

function getTimeBucket(now: Date): TimeBucket {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function getDashboardGreeting(rawName?: string): string {
  const name = rawName ? rawName.trim().split(/\s+/)[0] : 'there';
  const now = new Date();
  const bucket = getTimeBucket(now);
  const day = now.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat

  const pools: Record<TimeBucket, string[]> = {
    morning: [
      `Good morning, ${name}.`,
      `Morning, ${name}. Anything spent yet?`,
      `Fresh day, ${name}. Let's keep track.`,
      `Coffee first, ${name}, or logging first?`,
      `Start the morning clean, ${name}.`,
      `Good morning, ${name}. Ready when you are.`
    ],
    afternoon: [
      `Good afternoon, ${name}.`,
      `Afternoon check-in, ${name}.`,
      `Spent anything today, ${name}?`,
      `Lunch or errands to log, ${name}?`,
      `Midday check on your numbers, ${name}.`,
      `How's the day shaping up, ${name}?`
    ],
    evening: [
      `Good evening, ${name}.`,
      `Winding down, ${name}?`,
      `Any evening spending to note, ${name}?`,
      `Wrap up today's numbers, ${name}.`,
      `Quiet evening check-in, ${name}.`,
      `How did today's budget hold up, ${name}?`
    ],
    night: [
      `Up late, ${name}?`,
      `Quiet night, ${name}. Anything to log?`,
      `Late-night check-in, ${name}.`,
      `Still awake, ${name}? Catch up anytime.`,
      `Night owl ledger check, ${name}.`
    ]
  };

  const extras: string[] = [];
  if (day === 0 || day === 6) {
    extras.push(`Easy weekend, ${name}.`, `Weekend check-in, ${name}.`);
  } else if (day === 1 && bucket === 'morning') {
    extras.push(`Fresh week ahead, ${name}.`);
  } else if (day === 5 && bucket === 'evening') {
    extras.push(`Made it to Friday, ${name}.`);
  }

  return pickRandom([...pools[bucket], ...extras]);
}

export function getRabbAiGreeting(rawName?: string): { title: string; subtitle: string } {
  const name = rawName ? rawName.trim().split(/\s+/)[0] : '';
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const bucket = getTimeBucket(now);

  let titles: string[];
  if ((day === 5 && hour >= 16) || day === 6) {
    titles = [
      'Shabbat Shalom.',
      name ? `Shabbat Shalom, ${name}.` : 'Shabbat Shalom.',
      'Good Shabbos.'
    ];
  } else {
    const titlePools: Record<TimeBucket, string[]> = {
      morning: [
        'Shalom, good morning.',
        'Boker tov, good morning.',
        name ? `Good morning, ${name}.` : 'Good morning.',
        name ? `Shalom, ${name}. Ready for the day?` : 'Shalom, ready for the day?'
      ],
      afternoon: [
        'Shalom, good afternoon.',
        name ? `Good afternoon, ${name}.` : 'Good afternoon.',
        name ? `Hey ${name}, how is the day going?` : 'Hey there, how is the day going?'
      ],
      evening: [
        'Shalom, good evening.',
        'Erev tov, good evening.',
        name ? `Good evening, ${name}.` : 'Good evening.',
        name ? `Winding down for the evening, ${name}?` : 'Winding down for the evening?'
      ],
      night: [
        'Shalom, good night.',
        'Laila tov, good night.',
        name ? `Up late, ${name}?` : 'Up late?'
      ]
    };
    titles = titlePools[bucket];
  }

  const subtitles = [
    "A penny saved is peace of mind. Nu, what's doing with your gelt?",
    "Tell me what you spent, or drop a receipt. I'll sort it out.",
    "Small numbers add up quietly. What are we looking at today?",
    "Need a quick check on your balance, bills, or today's limit?",
    "Type it like a text message, and I'll turn it into a clean entry.",
    "No spreadsheets, no fuss. Just ask about your spending.",
    "Got a receipt photo or a rough note? Drop it right here.",
    "Let's keep the ledger tidy. What came in or went out?"
  ];

  return {
    title: pickRandom(titles),
    subtitle: pickRandom(subtitles)
  };
}
