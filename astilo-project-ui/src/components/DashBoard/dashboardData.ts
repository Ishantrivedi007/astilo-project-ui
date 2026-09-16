export interface Kpi {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  spark: number[];
}

export const KPIS: Kpi[] = [
  {
    label: "Revenue",
    value: "$148,320",
    delta: "+12.4%",
    trend: "up",
    spark: [32, 38, 35, 44, 50, 48, 61, 68],
  },
  {
    label: "Active users",
    value: "18,904",
    delta: "+4.1%",
    trend: "up",
    spark: [120, 128, 126, 140, 138, 150, 162, 171],
  },
  {
    label: "Orders",
    value: "3,217",
    delta: "-2.3%",
    trend: "down",
    spark: [61, 58, 63, 55, 52, 57, 49, 47],
  },
  {
    label: "Churn rate",
    value: "1.8%",
    delta: "-0.4pp",
    trend: "up",
    spark: [26, 24, 25, 22, 21, 20, 19, 18],
  },
];

export interface RevenuePoint {
  date: string;
  Subscriptions: number;
  Marketplace: number;
  Ads: number;
}

export const REVENUE: RevenuePoint[] = [
  { date: "Apr", Subscriptions: 42000, Marketplace: 18000, Ads: 9000 },
  { date: "May", Subscriptions: 45200, Marketplace: 19500, Ads: 9600 },
  { date: "Jun", Subscriptions: 47800, Marketplace: 21000, Ads: 10200 },
  { date: "Jul", Subscriptions: 46900, Marketplace: 24500, Ads: 11100 },
  { date: "Aug", Subscriptions: 51300, Marketplace: 26800, Ads: 11800 },
  { date: "Sep", Subscriptions: 55600, Marketplace: 29100, Ads: 12400 },
  { date: "Oct", Subscriptions: 58200, Marketplace: 31500, Ads: 13200 },
  { date: "Nov", Subscriptions: 62400, Marketplace: 33900, Ads: 13900 },
];

export const TRAFFIC = [
  { name: "Organic search", value: 4820 },
  { name: "Direct", value: 3110 },
  { name: "Social", value: 2260 },
  { name: "Referral", value: 1490 },
  { name: "Email", value: 980 },
];

export const TOP_CONTENT = [
  { name: "Copines — Aya Nakamura", value: 9214 },
  { name: "Joker (2019)", value: 7841 },
  { name: "Fjallraven Backpack", value: 6120 },
  { name: "Iris — Goo Goo Dolls", value: 5433 },
  { name: "SanDisk SSD PLUS 1TB", value: 4110 },
];

export const SIGNUPS = [
  { month: "Jun", Free: 1240, Pro: 320, Team: 88 },
  { month: "Jul", Free: 1380, Pro: 360, Team: 102 },
  { month: "Aug", Free: 1510, Pro: 410, Team: 121 },
  { month: "Sep", Free: 1620, Pro: 470, Team: 138 },
  { month: "Oct", Free: 1725, Pro: 520, Team: 150 },
  { month: "Nov", Free: 1890, Pro: 585, Team: 166 },
];

export interface UserRow {
  id: number;
  name: string;
  email: string;
  avatar: string;
  role: "Admin" | "Editor" | "Viewer";
  status: "active" | "invited" | "suspended";
  plan: "Free" | "Pro" | "Team";
  spend: string;
  joined: string;
}

// randomuser.me serves stable sample portrait photos from a static CDN
const face = (g: "men" | "women", n: number) =>
  `https://randomuser.me/api/portraits/${g}/${n}.jpg`;

export const USERS: UserRow[] = [
  { id: 1, name: "Ishan Trivedi", email: "ishan@astilo.io", avatar: face("men", 32), role: "Admin", status: "active", plan: "Team", spend: "$1,240", joined: "Jan 2024" },
  { id: 2, name: "Aya Nakamura", email: "aya@astilo.io", avatar: face("women", 44), role: "Editor", status: "active", plan: "Pro", spend: "$420", joined: "Mar 2024" },
  { id: 3, name: "John Legend", email: "john.l@astilo.io", avatar: face("men", 75), role: "Viewer", status: "invited", plan: "Free", spend: "$0", joined: "Apr 2024" },
  { id: 4, name: "Adele Adkins", email: "adele@astilo.io", avatar: face("women", 68), role: "Editor", status: "active", plan: "Pro", spend: "$685", joined: "May 2024" },
  { id: 5, name: "Louis Armstrong", email: "satchmo@astilo.io", avatar: face("men", 11), role: "Viewer", status: "suspended", plan: "Free", spend: "$35", joined: "Jun 2024" },
  { id: 6, name: "Stephen Bishop", email: "s.bishop@astilo.io", avatar: face("men", 54), role: "Editor", status: "active", plan: "Team", spend: "$980", joined: "Jul 2024" },
  { id: 7, name: "Nadia Rowe", email: "nadia@astilo.io", avatar: face("women", 21), role: "Viewer", status: "active", plan: "Pro", spend: "$210", joined: "Aug 2024" },
  { id: 8, name: "Marcus Feld", email: "marcus@astilo.io", avatar: face("men", 91), role: "Admin", status: "active", plan: "Team", spend: "$2,050", joined: "Sep 2024" },
];
