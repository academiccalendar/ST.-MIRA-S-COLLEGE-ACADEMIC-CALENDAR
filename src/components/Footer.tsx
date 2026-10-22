import React from 'react';
import { Building2, GraduationCap, Shield, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center space-x-2">
          <GraduationCap className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-slate-200">St. Mira's College for Girls</span>
          <span>• Official Academic Event & Calendar System</span>
        </div>

        <div className="flex items-center space-x-4">
          <span>Replacing legacy PHP/MySQL System</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-blue-400" /> JWT Protected
          </span>
        </div>

      </div>
    </footer>
  );
};
