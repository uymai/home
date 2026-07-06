export type Activity = {
  name: string;
  /** true = bodyweight-only; hides the weight input for this activity */
  noWeight?: boolean;
};

export type Block = {
  id: string;
  label: string;
  activities: Activity[];
};

export type Day = {
  id: string;
  label: string;
  blocks: Block[];
};

export type Program = {
  id: string;
  name: string;
  days: Day[];
};

export const PROGRAMS: Program[] = [
  {
    id: 'desity-with-andy-1',
    name: 'Desity with Andy 1',
    days: [
      {
        id: 'day1',
        label: 'Day 1',
        blocks: [
          {
            id: 'day1-block1',
            label: 'First block',
            activities: [
              { name: 'Dumbbell Romanian Deadlift' },
              { name: 'Overhead Press' },
            ],
          },
          {
            id: 'day1-block2',
            label: 'Second Block',
            activities: [
              { name: 'Front Lunge' },
              { name: 'Front Lunge' },
              { name: 'Bent Over Row' },
            ],
          },
        ],
      },
      {
        id: 'day2',
        label: 'Day 2',
        blocks: [
          {
            id: 'day2-block1',
            label: 'First block',
            activities: [
              { name: 'Bicep Curl' },
              { name: 'Tricep Kickback' },
              { name: 'Reverse Fly' },
            ],
          },
          {
            id: 'day2-block2',
            label: 'Second Block',
            activities: [
              { name: 'Forearm Plank', noWeight: true },
              { name: 'Tuck Up', noWeight: true },
            ],
          },
        ],
      },
      {
        id: 'day3',
        label: 'Day 3',
        blocks: [
          {
            id: 'day3-block1',
            label: 'First block',
            activities: [
              { name: 'Dumbbell Squat' },
              { name: 'Squat Jump' },
              { name: 'Push Press' },
            ],
          },
          {
            id: 'day3-block2',
            label: 'Second Block',
            activities: [
              { name: 'Neutral Grip Chest Press' },
              { name: 'Supinated Row' },
            ],
          },
        ],
      },
    ],
  },
];
