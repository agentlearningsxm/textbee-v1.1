import Image from 'next/image'
import { Cinzel, Cormorant_Garamond } from 'next/font/google'

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-cinzel',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-cormorant',
  display: 'swap',
})

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      // `dark` forces every theme CSS var (e.g. FormLabel's text-foreground) to resolve
      // to the dark palette inside this always-dark auth shell, regardless of the
      // visitor's system/next-themes preference — otherwise light-mode visitors get
      // near-black labels on the near-black cards.
      className={`dark ${cinzel.variable} ${cormorant.variable} font-cormorant relative min-h-screen w-full overflow-hidden bg-[#0D0D0D] px-4 py-12`}
    >
      {/* Subtle hieroglyph texture */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 opacity-[0.08]'
        style={{
          backgroundImage: "url('/images/reynubix/egyptian-pattern.png')",
          backgroundRepeat: 'repeat',
          backgroundSize: '420px 280px',
        }}
      />
      {/* Soft radial gold glow behind the mark */}
      <div
        aria-hidden
        className='pointer-events-none absolute left-1/2 top-0 h-[560px] w-[860px] -translate-x-1/2 rounded-full blur-3xl'
        style={{
          background:
            'radial-gradient(circle, rgba(201,169,110,0.18) 0%, rgba(201,169,110,0.06) 45%, rgba(201,169,110,0) 70%)',
        }}
      />
      {/* Base-to-edge vignette for depth */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0'
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, #0A0A0A 100%)',
        }}
      />

      <div className='relative z-10 flex min-h-[calc(100vh-6rem)] w-full flex-col items-center justify-center'>
        <Image
          src='/images/reynubix/anubis-logo.png'
          alt='Reynubix'
          width={480}
          height={371}
          priority
          className='mb-8 h-auto w-[150px] select-none sm:w-[190px]'
        />
        {children}
      </div>
    </div>
  )
}
