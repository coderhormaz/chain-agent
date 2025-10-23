import { ContactCard } from "./ui/contact-card";
import { MailIcon, PhoneIcon, MapPinIcon } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useState } from 'react';
import ShinyText from './ShinyText';

export function ContactUs() {
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		phone: '',
		message: ''
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
		type: null,
		message: ''
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setSubmitStatus({ type: null, message: '' });

		try {
			const response = await fetch('https://api.web3forms.com/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: JSON.stringify({
					access_key: '33ab3791-cf6f-4323-a696-248ff05e7c08',
					name: formData.name,
					email: formData.email,
					phone: formData.phone,
					message: formData.message,
					subject: 'New Contact Form Submission from opBNB AI Assistant'
				})
			});

			const result = await response.json();

			if (result.success) {
				setSubmitStatus({
					type: 'success',
					message: 'Thank you for your message! We will get back to you soon.'
				});
				// Reset form
				setFormData({ name: '', email: '', phone: '', message: '' });
			} else {
				setSubmitStatus({
					type: 'error',
					message: 'Something went wrong. Please try again or contact us directly at support@opbnb-ai.com'
				});
			}
		} catch (error) {
			console.error('Form submission error:', error);
			setSubmitStatus({
				type: 'error',
				message: 'Something went wrong. Please try again or contact us directly at support@opbnb-ai.com'
			});
		} finally {
			setIsSubmitting(false);
		}
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
					description={
						<>
							<ShinyText text="Have questions about our opBNB AI Assistant? Need help with blockchain integration?" speed={6} />
							{" "}
							<ShinyText text="Fill out the form and we'll respond within 1 business day." speed={6} />
						</>
					}
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
						{submitStatus.type && (
							<div 
								className={`p-4 rounded-lg border ${
									submitStatus.type === 'success' 
										? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' 
										: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
								}`}
							>
								{submitStatus.message}
							</div>
						)}
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
						<Button className="w-full" type="submit" disabled={isSubmitting}>
							{isSubmitting ? 'Sending...' : 'Send Message'}
						</Button>
					</form>
				</ContactCard>
			</div>
		</section>
	);
}
