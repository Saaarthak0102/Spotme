import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-surface-container-high border-t border-outline-variant/20 pt-16 pb-12 mt-auto">
      <div className="max-w-container-max mx-auto px-margin-desktop">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-16">
          <div className="col-span-1">
            <span className="font-serif text-3xl font-bold text-primary italic">Spotme</span>
            <p className="font-sans text-sm text-on-surface-variant mt-4 leading-relaxed">
              Preserving life&apos;s most intimate milestones with timeless grace. We combine high-end technology with artistic vision.
            </p>
          </div>
          <div className="col-span-1">
            <h4 className="font-sans font-semibold text-[14px] text-primary mb-6 uppercase tracking-wider">Explore</h4>
            <ul className="space-y-4">
              <li>
                <Link href="/about" className="text-on-surface-variant hover:text-primary transition-colors text-sm">
                  Our Story
                </Link>
              </li>
              <li>
                <Link href="/#features" className="text-on-surface-variant hover:text-primary transition-colors text-sm">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-on-surface-variant hover:text-primary transition-colors text-sm">
                  Collections &amp; Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-span-1">
            <h5 className="font-sans font-semibold text-[14px] text-primary mb-6 uppercase tracking-wider">Support</h5>
            <ul className="space-y-4">
              <li>
                <Link href="/contact" className="text-on-surface-variant hover:text-primary transition-colors text-sm">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-on-surface-variant hover:text-primary transition-colors text-sm">
                  FAQ
                </Link>
              </li>
              <li>
                <a href="#" className="text-on-surface-variant hover:text-primary transition-colors text-sm">
                  Client Portal
                </a>
              </li>
            </ul>
          </div>
          <div className="col-span-1">
            <h5 className="font-sans font-semibold text-[14px] text-primary mb-6 uppercase tracking-wider">Connect</h5>
            <ul className="space-y-4">
              <li>
                <a href="#" className="text-on-surface-variant hover:text-primary transition-colors text-sm">
                  Instagram
                </a>
              </li>
              <li>
                <a href="#" className="text-on-surface-variant hover:text-primary transition-colors text-sm">
                  Pinterest
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-outline-variant/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <p className="text-xs text-on-surface-variant">
            &copy; {new Date().getFullYear()} Spotme Photography. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors">
              Accessibility
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
