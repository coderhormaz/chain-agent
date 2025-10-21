import { useTheme } from '../../contexts/ThemeContext'
import { GlowingEffectDemo } from './GlowingEffectDemo'

export function Features() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    return (
        <section className={`py-16 md:py-24 relative overflow-hidden transition-colors duration-300 ${
            isDark ? 'bg-[#0f0f1e]' : 'bg-white'
        }`}>
            {/* Background gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-b ${
                isDark 
                    ? 'from-transparent via-[#1a1a2e]/50 to-transparent' 
                    : 'from-transparent via-gray-100/30 to-transparent'
            } pointer-events-none`}></div>
            
            <div className="mx-auto w-full space-y-12 md:space-y-16 px-6 md:px-8 lg:px-12 relative z-10">
                {/* Header Section */}
                <div className="space-y-4 md:space-y-6 text-center">
                    <h2 className={`text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight transition-colors duration-300 ${
                        isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                        Powerful <span className="gradient-text-green">AI-Driven</span> opBNB<br />
                        <span className="gradient-text-green">Blockchain Solutions</span>
                    </h2>
                    <p className={`text-base md:text-lg max-w-3xl mx-auto leading-relaxed transition-colors duration-300 ${
                        isDark ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                        Experience the future of decentralized intelligence with our comprehensive AI assistant designed for the opBNB ecosystem. Trade smarter, create faster, and manage wallets securely.
                    </p>
                </div>

                {/* Glowing Effect Demo */}
                <div className="w-full max-w-7xl mx-auto">
                    <GlowingEffectDemo />
                </div>
            </div>
        </section>
    )
}
