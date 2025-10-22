import { ContactCard } from "./ui/contact-card";
import { MailIcon, PhoneIcon, MapPinIcon } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

// Demo/Preview component - shows different contact card variations
export function ContactCardDemo() {
	return (
		<div className="space-y-12 py-20 px-4">
			{/* Default Contact Card */}
			<div className="mx-auto max-w-6xl">
				<h2 className="text-3xl font-bold mb-8 text-center">Default Contact Card</h2>
				<ContactCard
					title="Get in Touch"
					description="Have questions? We're here to help! Fill out the form and we'll respond within 1 business day."
					contactInfo={[
						{
							icon: MailIcon,
							label: 'Email',
							value: 'hello@example.com',
						},
						{
							icon: PhoneIcon,
							label: 'Phone',
							value: '+1 (555) 123-4567',
						},
						{
							icon: MapPinIcon,
							label: 'Address',
							value: 'San Francisco, CA',
							className: 'col-span-2',
						}
					]}
				>
					<form className="w-full space-y-4">
						<div className="flex flex-col gap-2">
							<Label htmlFor="demo-name">Name</Label>
							<Input type="text" id="demo-name" placeholder="John Doe" />
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="demo-email">Email</Label>
							<Input type="email" id="demo-email" placeholder="john@example.com" />
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="demo-phone">Phone</Label>
							<Input type="tel" id="demo-phone" placeholder="+1 (555) 123-4567" />
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="demo-message">Message</Label>
							<Textarea id="demo-message" placeholder="Your message here..." />
						</div>
						<Button className="w-full" type="submit">
							Send Message
						</Button>
					</form>
				</ContactCard>
			</div>

			{/* Minimal Contact Card - No contact info */}
			<div className="mx-auto max-w-6xl">
				<h2 className="text-3xl font-bold mb-8 text-center">Minimal Version (Form Only)</h2>
				<ContactCard
					title="Quick Contact"
					description="Send us a message and we'll get back to you as soon as possible."
					className="lg:grid-cols-2"
				>
					<form className="w-full space-y-4">
						<div className="flex flex-col gap-2">
							<Label>Name</Label>
							<Input type="text" placeholder="Your name" />
						</div>
						<div className="flex flex-col gap-2">
							<Label>Email</Label>
							<Input type="email" placeholder="your@email.com" />
						</div>
						<div className="flex flex-col gap-2">
							<Label>Message</Label>
							<Textarea placeholder="How can we help?" />
						</div>
						<Button className="w-full">Submit</Button>
					</form>
				</ContactCard>
			</div>
		</div>
	);
}
