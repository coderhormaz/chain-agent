import { Cpu, Fingerprint, Pencil, Settings2, Sparkles, Zap } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

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
                        Powerful AI-Driven opBNB<br />
                        Blockchain Solutions
                    </h2>
                    <p className={`text-base md:text-lg max-w-3xl mx-auto leading-relaxed transition-colors duration-300 ${
                        isDark ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                        Experience the future of decentralized intelligence with our comprehensive AI assistant designed for the opBNB ecosystem. Trade smarter, create faster, and manage wallets securely.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="w-full max-w-7xl mx-auto">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-0 rounded-none overflow-hidden">
                        {/* Feature 1 - Lightning Fast */}
                        <div className={`p-8 md:p-10 border-b sm:border-r border-white/10 dark:border-white/10 transition-all duration-300 ${
                            isDark 
                                ? 'bg-[#0f0f1e] hover:bg-[#1a1a2e]/50' 
                                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                        }`}>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Zap className={`w-5 h-5 flex-shrink-0 mt-1 transition-colors duration-300 ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`} strokeWidth={2.5} />
                                    <h3 className={`text-base font-semibold transition-colors duration-300 ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`}>Lightning Fast</h3>
                                </div>
                                <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                                    isDark ? 'text-gray-300' : 'text-gray-600'
                                }`}>
                                    Real-time AI analysis and instant transaction execution on opBNB with minimal latency.
                                </p>
                            </div>
                        </div>

                        {/* Feature 2 - AI Powered */}
                        <div className={`p-8 md:p-10 border-b lg:border-r transition-all duration-300 ${
                            isDark 
                                ? 'bg-[#0f0f1e] hover:bg-[#1a1a2e]/50 border-white/10' 
                                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                        }`}>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Cpu className={`w-5 h-5 flex-shrink-0 mt-1 transition-colors duration-300 ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`} strokeWidth={2.5} />
                                    <h3 className={`text-base font-semibold transition-colors duration-300 ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`}>AI Powered</h3>
                                </div>
                                <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                                    isDark ? 'text-gray-300' : 'text-gray-600'
                                }`}>
                                    Gemini AI integration for intelligent market analysis and predictive insights.
                                </p>
                            </div>
                        </div>

                        {/* Feature 3 - Secure Wallet */}
                        <div className={`p-8 md:p-10 border-b sm:border-r lg:border-r-0 transition-all duration-300 ${
                            isDark 
                                ? 'bg-[#0f0f1e] hover:bg-[#1a1a2e]/50 border-white/10' 
                                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                        }`}>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Fingerprint className={`w-5 h-5 flex-shrink-0 mt-1 transition-colors duration-300 ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`} strokeWidth={2.5} />
                                    <h3 className={`text-base font-semibold transition-colors duration-300 ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`}>Secure Wallets</h3>
                                </div>
                                <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                                    isDark ? 'text-gray-300' : 'text-gray-600'
                                }`}>
                                    Multi-wallet support with enterprise-grade security and Supabase authentication.
                                </p>
                            </div>
                        </div>

                        {/* Feature 4 - Create & Trade */}
                        <div className={`p-8 md:p-10 border-b sm:border-b-0 lg:border-b-0 sm:border-r transition-all duration-300 ${
                            isDark 
                                ? 'bg-[#0f0f1e] hover:bg-[#1a1a2e]/50 border-white/10' 
                                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                        }`}>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Pencil className={`w-5 h-5 flex-shrink-0 mt-1 transition-colors duration-300 ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`} strokeWidth={2.5} />
                                    <h3 className={`text-base font-semibold transition-colors duration-300 ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`}>Create & Trade</h3>
                                </div>
                                <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                                    isDark ? 'text-gray-300' : 'text-gray-600'
                                }`}>
                                    Deploy custom NFTs and tokens with AI assistance. Manage all your assets in one place.
                                </p>
                            </div>
                        </div>

                        {/* Feature 5 - Smart Contracts */}
                        <div className={`p-8 md:p-10 border-b sm:border-b-0 lg:border-b-0 lg:border-r transition-all duration-300 ${
                            isDark 
                                ? 'bg-[#0f0f1e] hover:bg-[#1a1a2e]/50 border-white/10' 
                                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                        }`}>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Settings2 className={`w-5 h-5 flex-shrink-0 mt-1 transition-colors duration-300 ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`} strokeWidth={2.5} />
                                    <h3 className={`text-base font-semibold transition-colors duration-300 ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`}>Smart Contracts</h3>
                                </div>
                                <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                                    isDark ? 'text-gray-300' : 'text-gray-600'
                                }`}>
                                    Optimized contract deployment and management powered by AI recommendations.
                                </p>
                            </div>
                        </div>

                        {/* Feature 6 - Cloud Storage */}
                        <div className={`p-8 md:p-10 transition-all duration-300 ${
                            isDark 
                                ? 'bg-[#0f0f1e] hover:bg-[#1a1a2e]/50' 
                                : 'bg-gray-50 hover:bg-gray-100'
                        }`}>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Sparkles className={`w-5 h-5 flex-shrink-0 mt-1 transition-colors duration-300 ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`} strokeWidth={2.5} />
                                    <h3 className={`text-base font-semibold transition-colors duration-300 ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`}>Cloud Storage</h3>
                                </div>
                                <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                                    isDark ? 'text-gray-300' : 'text-gray-600'
                                }`}>
                                    Lighthouse integration for decentralized file storage and NFT metadata.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
