import RoomClientProtected from "@/components/room/RoomClientProtected"

type Props = {
  params: {
    code: string
  }
}

export default function RoomPage({ params }: Props) {
  return <RoomClientProtected code={params.code} />
}
