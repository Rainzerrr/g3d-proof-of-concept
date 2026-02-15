const ADJECTIVES = [
  "Anonymous",
  "Brave",
  "Curious",
  "Daring",
  "Elegant",
  "Fearless",
  "Graceful",
  "Happy",
  "Inventive",
  "Jolly",
  "Kind",
  "Lively",
  "Mighty",
  "Noble",
  "Optimistic",
  "Playful",
  "Quick",
  "Radiant",
  "Swift",
  "Thoughtful",
  "Unique",
  "Vibrant",
  "Wise",
  "Zealous",
];

const ANIMALS = [
  "Aardvark",
  "Badger",
  "Cheetah",
  "Dolphin",
  "Eagle",
  "Fox",
  "Giraffe",
  "Hedgehog",
  "Iguana",
  "Jaguar",
  "Koala",
  "Lemur",
  "Mongoose",
  "Narwhal",
  "Octopus",
  "Panda",
  "Quokka",
  "Raccoon",
  "Sloth",
  "Tiger",
  "Unicorn",
  "Vulture",
  "Walrus",
  "Xerus",
  "Yak",
  "Zebra",
];

const USER_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
  "#F8B739",
  "#52B788",
  "#E84A5F",
  "#A8DADC",
  "#FF8B94",
  "#B4A7D6",
  "#FFD97D",
  "#AAF683",
  "#FF9FF3",
  "#54A0FF",
  "#48DBFB",
  "#FF6348",
];

export function generateUserName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adjective} ${animal}`;
}

export function generateUserColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

export function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
