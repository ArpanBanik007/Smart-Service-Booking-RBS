import { Link } from "react-router-dom";
import {
  FiFacebook,
  FiInstagram,
  FiTwitter,
  FiLinkedin,
  FiMail,
  FiPhone,
  FiMapPin,
} from "react-icons/fi";

const BRAND_NAME = "Near It...";
const BRAND_TAGLINE = "Service, by your side";

/* ------------------------------------------------------------------
   MOCK DATA: pore constants file / category API theke replace korbe.
------------------------------------------------------------------ */
const FOOTER_LINKS = [
  {
    title: "Services",
    links: [
      { label: "Plumber", to: "/providers?search=Plumber" },
      { label: "Electrician", to: "/providers?search=Electrician" },
      { label: "Cleaning", to: "/providers?search=Cleaning" },
      { label: "AC Repair", to: "/providers?search=AC%20Repair" },
      { label: "Painter", to: "/providers?search=Painter" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", to: "/about" },
      { label: "How it works", to: "/#how-it-works" },
      { label: "Contact", to: "/contact" },
      { label: "Careers", to: "/careers" },
    ],
  },
  {
    title: "For Providers",
    links: [
      { label: "Become a Provider", to: "/become-provider" },
      { label: "Provider Login", to: "/login" },
      { label: "Verification Process", to: "/provider-verification" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", to: "/help" },
      { label: "Terms of Service", to: "/terms" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Refund Policy", to: "/refund-policy" },
    ],
  },
];

const SOCIALS = [
  { label: "Facebook", icon: FiFacebook, href: "#" },
  { label: "Instagram", icon: FiInstagram, href: "#" },
  { label: "Twitter", icon: FiTwitter, href: "#" },
  { label: "LinkedIn", icon: FiLinkedin, href: "#" },
];

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white pb-16 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-6">
          {/* ================= BRAND ================= */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-sm">
                {BRAND_NAME.charAt(0)}
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-xl font-extrabold tracking-tight text-slate-900">
                  {BRAND_NAME}
                </span>
                <span className="mt-0.5 text-[10px] font-medium text-slate-500">
                  {BRAND_TAGLINE}
                </span>
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
              Find verified local professionals, book in minutes, pay securely
              and track your provider live, all in one place.
            </p>

            <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
              <li className="flex items-center gap-2.5">
                <FiMapPin className="text-indigo-600" />
                Kolkata, West Bengal, India
              </li>
              <li className="flex items-center gap-2.5">
                <FiMail className="text-indigo-600" />
                <a
                  href="mailto:support@pashe.in"
                  className="transition hover:text-indigo-700"
                >
                  support@pashe.in
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <FiPhone className="text-indigo-600" />
                <a
                  href="tel:+910000000000"
                  className="transition hover:text-indigo-700"
                >
                  +91 00000 00000
                </a>
              </li>
            </ul>
          </div>

          {/* ================= LINK COLUMNS ================= */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-4">
            {FOOTER_LINKS.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                  {group.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-sm text-slate-600 transition hover:text-indigo-700"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ================= BOTTOM BAR ================= */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
          <p className="text-sm text-slate-500">
            &copy; {year} {BRAND_NAME}. All rights reserved.
          </p>

          <div className="flex items-center gap-2">
            {SOCIALS.map(({ label, icon: Icon, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;