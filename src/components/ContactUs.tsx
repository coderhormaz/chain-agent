import { ContactCard } from "./ui/contact-card";
import { MailIcon, PhoneIcon, MapPinIcon } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useState } from 'react';

export function ContactUs() {
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		phone: '',
		message: ''
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// Handle form submission here
		console.log('Form submitted:', formData);
		// You can add your form submission logic here (e.g., send to API, Supabase, etc.)
		alert('Thank you for your message! We will get back to you soon.');
		// Reset form
		setFormData({ name: '', email: '', phone: '', message: '' });
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value
		});
	};

	return (
		<section className="relative w-full py-20 px-4 bg-background" id="contact">
			<div className="mx-auto max-w-6xl">
				<ContactCard
					title="Get in Touch"
					description="Have questions about our opBNB AI Assistant? Need help with blockchain integration? Fill out the form and we'll respond within 1 business day."
					contactInfo={[
						{
							icon: MailIcon,
							label: 'Email',
							value: 'support@opbnb-ai.com',
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
					<form onSubmit={handleSubmit} className="w-full space-y-4">
						<div className="flex flex-col gap-2">
							<Label htmlFor="name">Name</Label>
							<Input 
								type="text" 
								id="name"
								name="name"
								value={formData.name}
								onChange={handleChange}
								placeholder="John Doe"
								required
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="email">Email</Label>
							<Input 
								type="email" 
								id="email"
								name="email"
								value={formData.email}
								onChange={handleChange}
								placeholder="john@example.com"
								required
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="phone">Phone</Label>
							<Input 
								type="tel" 
								id="phone"
								name="phone"
								value={formData.phone}
								onChange={handleChange}
								placeholder="+1 (555) 123-4567"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="message">Message</Label>
							<Textarea 
								id="message"
								name="message"
								value={formData.message}
								onChange={handleChange}
								placeholder="Tell us how we can help you..."
								required
							/>
						</div>
						<Button className="w-full" type="submit">
							Send Message
						</Button>
					</form>
				</ContactCard>
			</div>
		</section>
	);
}
