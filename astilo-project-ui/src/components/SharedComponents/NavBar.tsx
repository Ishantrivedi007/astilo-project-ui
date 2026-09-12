import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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
  { label: "Anime", href: AppRoute.anime },
  { label: "Store", href: AppRoute.store },
  { label: "Dashboard", href: AppRoute.dashboard },
];

const useScrolled = (threshold = 12) => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
};

const NavBar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scrolled = useScrolled();

  const isActive = (href: string) =>
    href === AppRoute.home ? pathname === href : pathname.startsWith(href);

  return (
    <div
      className={`sticky top-0 z-40 px-3 transition-all duration-500 ease-out ${
        scrolled ? "pt-2" : "pt-4"
      }`}
    >
      <Navbar
        maxWidth="xl"
        isMenuOpen={isMenuOpen}
        onMenuOpenChange={setIsMenuOpen}
        classNames={{
          base: `nav-glass mx-auto max-w-5xl rounded-full transition-[height,box-shadow] duration-500 ease-out ${
            scrolled ? "nav-glass-scrolled" : ""
          }`,
          wrapper: `px-4 transition-[height] duration-500 ease-out ${
            scrolled ? "h-12" : "h-16"
          }`,
          menu: "nav-glass mx-3 mt-3 rounded-3xl pt-6",
        }}
      >
        <NavbarContent className="gap-3">
          <NavbarMenuToggle className="text-ink/70 sm:hidden" />
          <NavbarBrand>
            <Link
              href={AppRoute.home}
              className="group flex items-baseline gap-1 text-ink"
            >
              <motion.span
                whileHover={{ letterSpacing: "0.22em" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="font-display text-lg font-bold uppercase tracking-[0.16em]"
              >
                Astilo&apos;s
              </motion.span>
              <motion.span
                className="text-accent"
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              >
                .
              </motion.span>
            </Link>
          </NavbarBrand>
        </NavbarContent>

        <NavbarContent className="hidden gap-1 sm:flex" justify="center">
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <NavbarItem key={link.href} className="relative">
                <Link
                  href={link.href}
                  className={`relative z-10 block whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 ${
                    active ? "text-ink" : "text-ink/50 hover:text-ink/90"
                  }`}
                >
                  {link.label}
                </Link>
                {active && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-full bg-ink/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]"
                    transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  />
                )}
              </NavbarItem>
            );
          })}
        </NavbarContent>

        <NavbarContent justify="end" className="gap-2">
          <NavbarItem>
            <ThemeSwitcher />
          </NavbarItem>
          <NavbarItem>
            <motion.div whileTap={{ scale: 0.94 }} whileHover={{ scale: 1.04 }}>
              <Button
                size="sm"
                radius="full"
                variant="bordered"
                className="border-hair/40 font-medium text-ink hover:bg-ink/5"
                onPress={() => navigate(AppRoute.login)}
              >
                Log in
              </Button>
            </motion.div>
          </NavbarItem>
        </NavbarContent>

        <NavbarMenu className="gap-1 pt-6">
          <AnimatePresence>
            {links.map((link, i) => (
              <NavbarMenuItem key={link.href}>
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 320, damping: 28 }}
                >
                  <Link
                    href={link.href}
                    className={`block w-full rounded-xl px-3 py-2.5 text-base font-medium ${
                      isActive(link.href) ? "bg-ink/10 text-ink" : "text-ink/60"
                    }`}
                    onPress={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              </NavbarMenuItem>
            ))}
          </AnimatePresence>
        </NavbarMenu>
      </Navbar>
    </div>
  );
};

export default NavBar;
