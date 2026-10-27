export function handleTyping(socket, io, users) {
  return function onTyping(isTyping) {
    const user = users.get(socket.id);
    if (!user || !socket.currentRoom) return;
    socket.to(socket.currentRoom).emit('typing', {
      username: user.username,
      isTyping,
    });
  };
}