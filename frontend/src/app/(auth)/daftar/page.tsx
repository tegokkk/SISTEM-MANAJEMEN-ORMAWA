'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, GraduationCap, BookOpen, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

const options = [
  {
    id: 'ormawa',
    title: 'ORMAWA / UKM',
    description: 'Unit Kegiatan Mahasiswa di tingkat Politeknik',
    icon: Users,
    color: 'bg-brand-primary text-white',
    href: '/daftar/ormawa',
  },
  {
    id: 'hmj',
    title: 'Himpunan Mahasiswa Jurusan (HMJ)',
    description: 'Organisasi mahasiswa di tingkat Jurusan',
    icon: GraduationCap,
    color: 'bg-emerald-600 text-white',
    href: '/daftar/hmj',
  },
  {
    id: 'hima',
    title: 'Himpunan Mahasiswa Program Studi (HIMA)',
    description: 'Organisasi mahasiswa di tingkat Program Studi',
    icon: BookOpen,
    color: 'bg-blue-600 text-white',
    href: '/daftar/hima',
  },
];

export default function PendaftaranPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-heading font-bold text-gray-900 tracking-tight">
            Pendaftaran Organisasi Baru
          </h1>
          <p className="mt-3 text-base text-gray-500 max-w-2xl mx-auto">
            Pilih jenis organisasi yang ingin Anda daftarkan. Pengajuan Anda akan ditinjau oleh
            pihak berwenang (Super Admin atau HMJ Induk).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {options.map((option, index) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
            >
              <Link
                href={option.href}
                className="block h-full group relative bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-brand-primary/30 transition-all duration-300"
              >
                <div className={`inline-flex p-3 rounded-xl ${option.color} shadow-sm mb-4`}>
                  <option.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-brand-primary transition-colors">
                  {option.title}
                </h3>
                <p className="text-sm text-gray-500 mb-6 line-clamp-3">{option.description}</p>
                <div className="absolute bottom-6 left-6 right-6 flex items-center text-sm font-semibold text-brand-primary">
                  <span>Daftar sekarang</span>
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Sudah mengajukan sebelumnya?{' '}
            <Link
              href="/status-pengajuan"
              className="font-semibold text-brand-primary hover:text-brand-primary-dark"
            >
              Cek status pengajuan Anda
            </Link>
          </p>
          <div className="mt-4">
            <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-gray-600">
              ← Kembali ke halaman Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
