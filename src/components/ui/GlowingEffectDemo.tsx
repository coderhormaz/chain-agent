import { Zap, Cpu, Fingerprint, Pencil, Settings2, Sparkles } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

export function GlowingEffectDemo() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-3 lg:gap-4 xl:max-h-[34rem] xl:grid-rows-2">
      <GridItem
        area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]"
        icon={<Zap className="h-5 w-5 gradient-text-green" strokeWidth={2.5} />}
        title="Lightning Fast"
        description="Real-time AI analysis and instant transaction execution on opBNB with minimal latency."
        isDark={isDark}
      />
      <GridItem
        area="md:[grid-area:1/7/2/13] xl:[grid-area:2/1/3/5]"
        icon={<Cpu className="h-5 w-5 gradient-text-green" strokeWidth={2.5} />}
        title="AI Powered"
        description="Gemini AI integration for intelligent market analysis and predictive insights."
        isDark={isDark}
      />
      <GridItem
        area="md:[grid-area:2/1/3/7] xl:[grid-area:1/5/3/8]"
        icon={<Fingerprint className="h-5 w-5 gradient-text-green" strokeWidth={2.5} />}
        title="Secure Wallets"
        description="Multi-wallet support with enterprise-grade security and Supabase authentication."
        isDark={isDark}
      />
      <GridItem
        area="md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]"
        icon={<Pencil className="h-5 w-5 gradient-text-green" strokeWidth={2.5} />}
        title="Create & Trade"
        description="Deploy custom NFTs and tokens with AI assistance. Manage all your assets in one place."
        isDark={isDark}
      />
      <GridItem
        area="md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]"
        icon={<Settings2 className="h-5 w-5 gradient-text-green" strokeWidth={2.5} />}
        title="Smart Contracts"
        description="Optimized contract deployment and management powered by AI recommendations."
        isDark={isDark}
      />
    </ul>
  );
}

interface GridItemProps {
  area: string;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  isDark: boolean;
}

const GridItem = ({ area, icon, title, description, isDark }: GridItemProps) => {
  return (
    <li className={cn("min-h-[14rem] list-none", area)}>
      <div className={cn(
        "relative h-full rounded-[1.25rem] p-2 md:rounded-[1.5rem] md:p-3 transition-colors duration-300",
        isDark 
          ? "border-[0.75px] border-white/10" 
          : "border-[0.75px] border-gray-200"
      )}>
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={3}
        />
        <div className={cn(
          "relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] p-6 md:p-6 transition-all duration-300",
          isDark 
            ? "bg-[#0f0f1e] border-white/10 shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]" 
            : "bg-white border-gray-200 shadow-sm hover:shadow-md"
        )}>
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            <div className={cn(
              "w-fit rounded-lg p-2 transition-colors duration-300",
              isDark 
                ? "border-[0.75px] border-white/10 bg-[#1a1a2e]" 
                : "border-[0.75px] border-gray-200 bg-gray-50"
            )}>
              {icon}
            </div>
            <div className="space-y-3">
              <h3 className={cn(
                "pt-0.5 text-xl leading-[1.375rem] font-semibold font-sans tracking-[-0.04em] md:text-2xl md:leading-[1.875rem] text-balance transition-colors duration-300",
                isDark ? "text-white" : "text-gray-900"
              )}>
                {title}
              </h3>
              <p className={cn(
                "font-sans text-sm leading-[1.125rem] md:text-base md:leading-[1.375rem] transition-colors duration-300",
                isDark ? "text-gray-300" : "text-gray-600"
              )}>
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};
