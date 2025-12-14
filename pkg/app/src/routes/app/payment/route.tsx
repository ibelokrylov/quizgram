import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/payment')({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div>
			{/* Payment page content */}
		</div>
	);
}
