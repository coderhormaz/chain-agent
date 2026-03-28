'use client';
import React from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useScroll } from '@/components/ui/use-scroll';
import { useAuthModalStore } from '../../store/index';
import { useAuthStore } from '../../store/authStore';
import { ThemeToggle } from '../ThemeToggle';
import { useTheme } from '../../contexts/ThemeContext';
import StaggeredMenu from '@/components/ui/StaggeredMenu';
import type { StaggeredMenuItem } from '@/components/ui/StaggeredMenu';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function Header() {
	const [open, setOpen] = React.useState(false);
	const [menuOpen, setMenuOpen] = React.useState(false);
	const scrolled = useScroll(10);
	const { openLogin, openSignup } = useAuthModalStore();
	const { isAuthenticated, logout } = useAuthStore();
	const { theme } = useTheme();
	const navigate = useNavigate();

	const handleLogout = () => {
		// Clear local state first so the redirect is instant.
		// Fire-and-forget the Supabase signOut (it can hang on lock contention).
		logout();
		localStorage.removeItem('opbnb-ai-remember-me');
		localStorage.removeItem('wallet-storage');
		localStorage.removeItem('opbnb-ai-auth');
		supabase.auth.signOut().catch(() => {});
		window.location.href = '/';
	};

	const handleDashboardClick = () => {
		navigate('/dashboard');
	};

	const links = [
		{
			label: 'Home',
			href: '#hero',
		},
		{
			label: 'Features',
			href: '#features',
		},
		{
			label: 'Stats',
			href: '#stats',
		},
		{
			label: 'Contact',
			href: '#contact',
		},
	];

	const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
		e.preventDefault();
		const element = document.querySelector(href);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
			setOpen(false);
		}
	};

	// Menu items for StaggeredMenu
	const menuItems: StaggeredMenuItem[] = links.map(link => ({
		label: link.label,
		ariaLabel: `Navigate to ${link.label}`,
		link: link.href,
	}));

	// Add auth buttons to menu items
	const authMenuItems: StaggeredMenuItem[] = isAuthenticated
		? [
				...menuItems,
				{ label: 'Dashboard', ariaLabel: 'Go to dashboard', link: '#dashboard' },
				{ label: 'Logout', ariaLabel: 'Logout from your account', link: '#logout' },
		  ]
		: [
				...menuItems,
				{ label: 'Sign In', ariaLabel: 'Sign in to your account', link: '#signin' },
				{ label: 'Get Started', ariaLabel: 'Get started with opBNB', link: '#signup' },
		  ];

	React.useEffect(() => {
		if (open) {
			// Disable scroll
			document.body.style.overflow = 'hidden';
		} else {
			// Re-enable scroll
			document.body.style.overflow = '';
		}

		// Cleanup when component unmounts (important for Next.js)
		return () => {
			document.body.style.overflow = '';
		};
	}, [open]);

	// Handle menu item clicks for StaggeredMenu
	const handleMenuItemClick = (href: string) => {
		// Handle special auth links
		if (href === '#signin') {
			openLogin();
			return;
		}
		if (href === '#signup') {
			openSignup();
			return;
		}
		if (href === '#logout') {
			handleLogout();
			return;
		}
		if (href === '#dashboard') {
			handleDashboardClick();
			return;
		}

		// Handle regular navigation
		const element = document.querySelector(href);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	};

	// Add click handlers to menu items
	React.useEffect(() => {
		const menuLinks = document.querySelectorAll('.sm-panel-item');
		menuLinks.forEach(link => {
			link.addEventListener('click', handleMenuItemClick as any);
		});

		return () => {
			menuLinks.forEach(link => {
				link.removeEventListener('click', handleMenuItemClick as any);
			});
		};
	}, [menuOpen]);

	return (
		<>
			{/* Mobile-only StaggeredMenu */}
			<StaggeredMenu
				position="right"
				items={authMenuItems}
				displaySocials={false}
				displayItemNumbering={true}
				menuButtonColor={theme === 'light' ? '#000' : '#fff'}
				openMenuButtonColor={theme === 'light' ? '#000' : '#fff'}
				changeMenuColorOnOpen={false}
				colors={theme === 'light' ? ['#f0f0f0', '#e0e0e0'] : ['#1a1b26', '#14151f']}
				logoComponent={<WordmarkIcon className="h-4 gradient-text-green" />}
				accentColor="#10b981"
				isFixed={true}
				onMenuOpen={() => setMenuOpen(true)}
				onMenuClose={() => setMenuOpen(false)}
				onItemClick={handleMenuItemClick}
				extraHeaderContent={<ThemeToggle />}
			/>

			{/* Desktop header */}
			<header
				className={cn(
					'sticky top-0 z-50 mx-auto w-full max-w-6xl border-b border-transparent md:rounded-md md:border md:transition-all md:ease-out header-glass',
					{
						'header-scrolled md:top-4 md:max-w-5xl md:shadow-lg':
							scrolled && !open,
					},
				)}
				style={
					scrolled && !open
						? {
								backgroundColor: 'rgba(255, 255, 255, 0.6)',
								borderColor: 'var(--border-medium)',
								backdropFilter: 'blur(20px)',
						  }
						: open
						? {
								backgroundColor: 'rgba(255, 255, 255, 0.9)',
								backdropFilter: 'blur(20px)',
						  }
						: undefined
				}
			>
				<nav
					className={cn(
						'flex h-14 w-full items-center justify-between px-5 md:h-12 md:transition-all md:ease-out',
						{
							'md:px-3': scrolled,
						},
					)}
				>
					<WordmarkIcon className="h-4 gradient-text-green md:block hidden" />
					<div className="hidden items-center gap-2 md:flex">
						{links.map((link, i) => (
							<a 
								key={i} 
								className={buttonVariants({ variant: 'ghost' })} 
								href={link.href}
								onClick={(e) => handleNavClick(e, link.href)}
							>
								{link.label}
							</a>
						))}
						<ThemeToggle />
						{isAuthenticated ? (
							<>
								<Button variant="outline" onClick={handleLogout}>Logout</Button>
								<Button 
									onClick={handleDashboardClick}
									style={{
										backgroundColor: theme === 'light' ? '#000 !important' : '#fff !important',
										color: theme === 'light' ? '#fff !important' : '#000 !important',
									} as React.CSSProperties}
									className="get-started-btn"
								>
									Go to Dashboard
								</Button>
							</>
						) : (
							<>
								<Button variant="outline" onClick={openLogin}>Sign In</Button>
								<Button 
									onClick={openSignup}
									style={{
										backgroundColor: theme === 'light' ? '#000 !important' : '#fff !important',
										color: theme === 'light' ? '#fff !important' : '#000 !important',
									} as React.CSSProperties}
									className="get-started-btn"
								>
									Get Started
								</Button>
							</>
						)}
					</div>
				</nav>
			</header>
		</>
	);
}

export const WordmarkIcon = (props: React.ComponentProps<"div">) => (
  <div style={{ 
    fontFamily: "'Bitcount Grid Single', system-ui", 
    fontOpticalSizing: 'auto',
    fontWeight: 300, 
    letterSpacing: '-0.02em',
    fontSize: '1.5rem',
    lineHeight: 1,
    fontVariationSettings: '"slnt" 0, "CRSV" 0.5, "ELSH" 0, "ELXP" 1'
  }} {...props}>
    Chain Agent
  </div>
);
