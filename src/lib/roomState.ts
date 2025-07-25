let currentRoomCode: string | null = null

export function getCurrentRoomCode() {
  return currentRoomCode
}

export function setCurrentRoomCode(code: string | null) {
  currentRoomCode = code
}
