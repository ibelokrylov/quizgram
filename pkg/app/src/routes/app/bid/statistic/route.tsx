import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/bid/statistic')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/bid/report/statistic"!</div>
}
