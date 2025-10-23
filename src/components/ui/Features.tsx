import { useTheme } from '../../contexts/ThemeContext'
import { GlowingEffectDemo } from './GlowingEffectDemo'
import { motion } from 'framer-motion'

export function Features() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const titleVariants = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.3
            }
        }
    };

    const wordVariants = {
        hidden: { 
            y: 60, 
            opacity: 0,
            filter: 'blur(4px)'
        },
        visible: {
            y: 0,
            opacity: 1,
            filter: 'blur(0px)',
            transition: {
                duration: 1.0,
                ease: [0.22, 1, 0.36, 1] as const
            }
        }
    };

    const renderAnimatedWords = (text: string, className?: string) => {
        const words = text.split(' ');
        return words.map((word, index) => (
            <motion.span
                key={`${word}-${index}`}
                variants={wordVariants}
                style={{ display: 'inline-block', marginRight: '0.3em' }}
                className={className}
            >
                {word}
            </motion.span>
        ));
    };

    return (
        <section 
            id="features"
            className={`py-16 md:py-24 relative overflow-hidden transition-colors duration-300 ${
                isDark ? 'bg-[#0f0f1e]' : 'bg-white'
            }`}
            style={{
                padding: '5rem 0',
                background: isDark 
                    ? 'linear-gradient(180deg, transparent 0%, rgba(102, 126, 234, 0.05) 100%)'
                    : 'linear-gradient(180deg, transparent 0%, rgba(102, 126, 234, 0.03) 100%)',
                position: 'relative'
            }}
        >
            {/* Background gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-b ${
                isDark 
                    ? 'from-transparent via-[#1a1a2e]/50 to-transparent' 
                    : 'from-transparent via-gray-100/30 to-transparent'
            } pointer-events-none`}></div>
            
            <div className="mx-auto w-full space-y-12 md:space-y-16 px-6 md:px-8 lg:px-12 relative z-10">
                {/* Header Section */}
                <div className="space-y-4 md:space-y-6 text-center">
                    <motion.h2 
                        className={`text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight transition-colors duration-300 ${
                            isDark ? 'text-white' : 'text-gray-900'
                        }`}
                        variants={titleVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: false }}
                        style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}
                    >
                        <span style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                            {renderAnimatedWords('Powerful')}
                            {renderAnimatedWords('AI-Driven', 'gradient-text-green')}
                            {renderAnimatedWords('opBNB')}
                        </span>
                        <span style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                            {renderAnimatedWords('Blockchain Solutions', 'gradient-text-green')}
                        </span>
                    </motion.h2>
                    <p className={`text-base md:text-lg max-w-3xl mx-auto leading-relaxed transition-colors duration-300 ${
                        isDark ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                        Experience the future of decentralized intelligence with our comprehensive AI assistant designed for the opBNB ecosystem. Trade smarter, create faster, and manage wallets securely.
                    </p>
                </div>

                {/* Glowing Effect Demo */}
                <div className="w-full max-w-7xl mx-auto mb-0">
                    <GlowingEffectDemo />
                </div>
            </div>
        </section>
    )
}
