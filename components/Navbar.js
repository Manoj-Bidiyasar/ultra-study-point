"use client"; 

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

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
          <Link href="/" className={`transition ${isActive("/") ? "text-yellow-200" : "hover:text-blue-200"}`}>Home</Link>
          <Link href="/current-affairs" className={`transition ${isActive("/current-affairs") ? "text-yellow-200" : "hover:text-blue-200"}`}>Current Affairs</Link>
          <Link href="/notes" className={`transition ${isActive("/notes") ? "text-yellow-200" : "hover:text-blue-200"}`}>Notes Hub</Link>
          <Link href="/quiz" className={`transition ${isActive("/quiz") ? "text-yellow-200" : "hover:text-blue-200"}`}>Quizzes</Link>
          <Link href="/pyqs" className={`transition ${isActive("/pyqs") ? "text-yellow-200" : "hover:text-blue-200"}`}>PYQs</Link>
          {/* ADDED THIS LINK */}
          <Link href="/about" className={`transition ${isActive("/about") ? "text-yellow-200" : "hover:text-blue-200"}`}>About Us</Link>
        </div>

        {/* MOBILE BUTTON */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-2xl focus:outline-none">
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* MOBILE MENU (Visible on Phone) */}
      {isOpen && (
        <div className="md:hidden bg-blue-800 border-t border-blue-600">
           <Link href="/" onClick={() => setIsOpen(false)} className={`block py-3 px-4 border-b border-blue-700 hover:bg-blue-900 ${isActive("/") ? "bg-blue-900 text-yellow-200" : ""}`}>Home</Link>
           <Link href="/current-affairs" onClick={() => setIsOpen(false)} className={`block py-3 px-4 border-b border-blue-700 hover:bg-blue-900 ${isActive("/current-affairs") ? "bg-blue-900 text-yellow-200" : ""}`}>Current Affairs</Link>
           <Link href="/notes" onClick={() => setIsOpen(false)} className={`block py-3 px-4 border-b border-blue-700 hover:bg-blue-900 ${isActive("/notes") ? "bg-blue-900 text-yellow-200" : ""}`}>Notes Hub</Link>
           <Link href="/quiz" onClick={() => setIsOpen(false)} className={`block py-3 px-4 border-b border-blue-700 hover:bg-blue-900 ${isActive("/quiz") ? "bg-blue-900 text-yellow-200" : ""}`}>Quizzes</Link>
           <Link href="/pyqs" onClick={() => setIsOpen(false)} className={`block py-3 px-4 border-b border-blue-700 hover:bg-blue-900 ${isActive("/pyqs") ? "bg-blue-900 text-yellow-200" : ""}`}>PYQs</Link>
           {/* ADDED THIS LINK */}
           <Link href="/about" onClick={() => setIsOpen(false)} className={`block py-3 px-4 hover:bg-blue-900 ${isActive("/about") ? "bg-blue-900 text-yellow-200" : ""}`}>About Us</Link>
        </div>
      )}
    </nav>
  );
}
