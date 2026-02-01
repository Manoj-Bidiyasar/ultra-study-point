// components/Footer.js
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-10 pb-8 border-t border-gray-800 mt-10">
      <div className="container mx-auto px-8 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          {/* QUICK LINKS */}
          <div>
            <h4 className="text-white font-bold underline mb-4">Quick Links</h4>
            <ul className="space-y-3 text-[13px]">
              <li><Link href="/" className="hover:text-blue-400 transition">Home</Link></li>
              <li><Link href="/current-affairs" className="hover:text-blue-400 transition">Current Affairs</Link></li>
              <li><Link href="/notes" className="hover:text-blue-400 transition">Notes Hub</Link></li>
              <li><Link href="/about" className="hover:text-blue-400 transition">About Us</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-blue-400 transition">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* FOLLOW US */}
          <div>
            <h4 className="text-white font-bold underline mb-4">Follow Us</h4>
            <div className="space-y-3 text-[13px]">
              <a href="#" className="block hover:text-red-500 transition">YouTube</a>
              <a href="#" className="block hover:text-blue-400 transition">Telegram</a>
            </div>
          </div>

          {/* CONTACT */}
          <div>
            <h4 className="text-white font-bold underline mb-4">Contact</h4>
            <div className="space-y-4 text-[13px]">
              <div>Email: contact@ultrastudypoint.com</div>
              <div>Location: Jaipur, Rajasthan, India</div>
            </div>
          </div>
        </div>
        <hr className="border-gray-800 mb-4" />
        <div className="text-center">
          <p className="opacity-60 text-[11px]">&copy; 2025 Ultra Study Point. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}