export const metadata = {
  title: {
    default: "پنل مدیریت",
    template: "%s | پنل مدیریت",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AdminLayout({ children }) {
  return children;
}
