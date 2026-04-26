export const metadata = {
  title: "Rodgo Edge",
  description: "Clean Rodgo Edge frontend",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
