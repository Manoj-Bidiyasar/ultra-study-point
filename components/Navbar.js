"use client"; 

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-blue-700 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center max-w-6xl">
        
        {/* LOGO */}
        <Link href="/" className="font-bold text-lg flex items-center gap-2" onClick={() => setIsOpen(false)}>
           <span className="text-xl">📖</span> 
           <span>Ultra Study Point</span>
        </Link>

        {/* DESKTOP LINKS (Visible on Computer) */}
        <div className="hidden md:flex gap-6 text-sm font-semibold">
          <Link href="/" className="hover:text-blue-200 transition">Home</Link>
          <Link href="/current-affairs" className="hover:text-blue-200 transition">Current Affairs</Link>
          <Link href="/notes" className="hover:text-blue-200 transition">Notes Hub</Link>
          {/* ADDED THIS LINK */}
          <Link href="/about" className="hover:text-blue-200 transition">About Us</Link>
        </div>

        {/* MOBILE BUTTON */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-2xl focus:outline-none">
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* MOBILE MENU (Visible on Phone) */}
      {isOpen && (
        <div className="md:hidden bg-blue-800 border-t border-blue-600">
           <Link href="/" onClick={() => setIsOpen(false)} className="block py-3 px-4 border-b border-blue-700 hover:bg-blue-900">Home</Link>
           <Link href="/current-affairs" onClick={() => setIsOpen(false)} className="block py-3 px-4 border-b border-blue-700 hover:bg-blue-900">Current Affairs</Link>
           <Link href="/notes" onClick={() => setIsOpen(false)} className="block py-3 px-4 border-b border-blue-700 hover:bg-blue-900">Notes Hub</Link>
           {/* ADDED THIS LINK */}
           <Link href="/about" onClick={() => setIsOpen(false)} className="block py-3 px-4 hover:bg-blue-900">About Us</Link>
        </div>
      )}
    </nav>
  );
}