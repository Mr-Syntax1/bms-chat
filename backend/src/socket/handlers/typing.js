export function handleTyping(socket, io, users) {
  return function onTyping(isTyping) {
    const user = users.get(socket.id);
    if (!user) return;
    socket.broadcast.emit('typing', {
      username: user.username,
      isTyping,
    });
  };
}