import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
  Button,
  Link,
} from "@heroui/react";

import { AppRoute } from "../../app/AppRoute";
import ThemeSwitcher from "../../theme/ThemeSwitcher";

const links = [
  { label: "Home", href: AppRoute.home },
  { label: "Music", href: AppRoute.music },
  { label: "Movies", href: AppRoute.movies },
  { label: "Store", href: AppRoute.store },
  { label: "Dashboard", href: AppRoute.dashboard },
];

const NavBar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === AppRoute.home ? pathname === href : pathname.startsWith(href);

  return (
    <div className="sticky top-0 z-40 px-3 pt-4">
      <Navbar
        maxWidth="xl"
        isMenuOpen={isMenuOpen}
        onMenuOpenChange={setIsMenuOpen}
        classNames={{
          base: "mx-auto max-w-5xl rounded-2xl glass-card shadow-[0_16px_40px_-20px_rgba(0,0,0,0.55)]",
          wrapper: "h-14 px-4",
          menu: "glass-card mx-3 mt-3 rounded-2xl pt-6",
        }}
      >
        <NavbarContent className="gap-3">
          <NavbarMenuToggle className="text-ink/70 sm:hidden" />
          <NavbarBrand>
            <Link
              href={AppRoute.home}
              className="flex items-baseline gap-1 text-ink"
            >
              <span className="font-display text-lg font-bold uppercase tracking-[0.16em]">
                Astilo&apos;s
              </span>
              <span className="text-accent">.</span>
            </Link>
          </NavbarBrand>
        </NavbarContent>

        <NavbarContent className="hidden gap-1 sm:flex" justify="center">
          {links.map((link) => (
            <NavbarItem key={link.href}>
              <Link
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-ink/10 text-ink"
                    : "text-ink/50 hover:bg-ink/5 hover:text-ink/90"
                }`}
              >
                {link.label}
              </Link>
            </NavbarItem>
          ))}
        </NavbarContent>

        <NavbarContent justify="end" className="gap-2">
          <NavbarItem>
            <ThemeSwitcher />
          </NavbarItem>
          <NavbarItem>
            <Button
              size="sm"
              radius="full"
              variant="bordered"
              className="border-hair/40 font-medium text-ink hover:bg-ink/5"
              onPress={() => navigate(AppRoute.login)}
            >
              Log in
            </Button>
          </NavbarItem>
        </NavbarContent>

        <NavbarMenu className="gap-1 pt-6">
          {links.map((link) => (
            <NavbarMenuItem key={link.href}>
              <Link
                href={link.href}
                className={`block w-full rounded-xl px-3 py-2.5 text-base font-medium ${
                  isActive(link.href) ? "bg-ink/10 text-ink" : "text-ink/60"
                }`}
                onPress={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            </NavbarMenuItem>
          ))}
        </NavbarMenu>
      </Navbar>
    </div>
  );
};

export default NavBar;
