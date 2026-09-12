export type StreamStatus = "idle" | "connecting" | "recording" | "error";
export class AudioStream {
  private socket?: WebSocket; private recorder?: MediaRecorder; private stream?: MediaStream;
  async start(websocketUrl: string, accessToken?: string) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    this.socket = new WebSocket(websocketUrl);
    await new Promise<void>((resolve, reject) => { this.socket!.onopen = () => resolve(); this.socket!.onerror = () => reject(new Error("Could not connect to the audio service")); });
    this.socket.send(JSON.stringify({ type: "audio:start", accessToken }));
    this.recorder = new MediaRecorder(this.stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : undefined });
    this.recorder.ondataavailable = ({ data }) => { if (data.size && this.socket?.readyState === WebSocket.OPEN) this.socket.send(data); };
    this.recorder.start(250);
  }
  stop() { this.recorder?.stop(); this.stream?.getTracks().forEach(track => track.stop()); if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify({ type: "audio:stop" })); this.socket?.close(); this.recorder = undefined; this.stream = undefined; this.socket = undefined; }
}
