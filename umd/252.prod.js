"use strict";(globalThis.webpackChunktinode_webapp=globalThi.webpackChunktinode_webapp||[]).push([[252],{252:(e,t,i)=>{i.r(t),i.d(t,{default:()=>g});var s=i(7363),a=i.n(s),n=i(916),r=i(4861),o=i(8246),h=i.n(o),d=i(8405),l=i(3905),c=i(8962);const u=100,m="audio/webm",p=[m,"audio/mp4",""],v=(0,n.defineMessages)({icon_title_delete:{id:"icon_title_delete",defaultMessage:[{type:0,value:"Delete recording"}]},icon_title_pause:{id:"icon_title_pause",defaultMessage:[{type:0,value:"Pause playback"}]},icon_title_resume:{id:"icon_title_resume",defaultMessage:[{type:0,value:"Resume playback"}]},icon_title_send:{id:"icon_title_send",defaultMessage:[{type:0,value:"Send message"}]},failed_to_init_audio:{id:"failed_to_init_audio",defaultMessage:[{type:0,value:"Failed to initialize audio recording"}]}});class f extends a().PureComponent{constructor(e){super(e),this.state={enabled:!0,audioRecord:null,recording:!0,paused:!1,duration:"0:00",blobUrl:null,preview:null},this.visualize=this.visualize.bind(this),this.initMediaRecording=this.initMediaRecording.bind(this),this.initCanvas=this.initCanvas.bind(this),this.getRecording=this.getRecording.bind(this),this.cleanUp=this.cleanUp.bind(this),this.handleResume=this.handleResume.bind(this),this.handlePause=this.handlePause.bind(this),this.handleDelete=this.handleDelete.bind(this),this.handleDone=this.handleDone.bind(this),this.durationMillis=0,this.startedOn=null,this.viewBuffer=[],this.canvasRef=a().createRef(),this.recordingTimestamp=0}componentDidMount(){this.stream=null,this.mediaRecorder=null,this.audioContext=null,this.audioInput=null,this.analyser=null,this.audioChunks=[];try{navigator.mediaDevices.getUserMedia({audio:!0,video:!1}).then(this.initMediaRecording,this.props.onError)}catch(e){this.props.onError(e)}}componentWillUnmount(){this.startedOn=null,this.stream&&this.cleanUp()}visualize(){this.initCanvas();const e=new Uint8Array(this.analyser.frequencyBinCount),t=this.canvasWidth,i=this.canvasHeight,s=t/10|0,a=u*s;this.canvasContext.lineWidth=6,this.canvasContext.strokeStyle="#BBBD";let n=0,r=0,o=0;const h=d=>{if(!this.startedOn)return;window.requestAnimationFrame(h);const m=this.durationMillis+(Date.now()-this.startedOn);this.setState({duration:(0,l.nH)(m/1e3)}),m>c.Zf&&(this.startedOn=null,this.mediaRecorder.pause(),this.durationMillis+=Date.now()-this.startedOn,this.setState({enabled:!1,recording:!1,duration:(0,l.nH)(this.durationMillis/1e3)})),this.analyser.getByteTimeDomainData(e);let p=0;for(const t of e)p+=(t-127)**2;r+=Math.sqrt(p/e.length),o++;let v=m/u|0;const f=a>m?0:(m-u*v)/u*10;n!=v&&(n=v,this.viewBuffer.push(r/o),r=0,o=0,this.viewBuffer.length>s&&this.viewBuffer.shift()),this.canvasContext.clearRect(0,0,t,i),this.canvasContext.beginPath();for(let e=0;e<this.viewBuffer.length;e++){let t=10*e-f,s=Math.max(Math.min(this.viewBuffer[e]/64,.9)*i,1);this.canvasContext.moveTo(t,.5*(i-s)),this.canvasContext.lineTo(t,.5*(i+s))}this.canvasContext.stroke();const g=(new Date).getTime();g-this.recordingTimestamp>c.mc&&(this.props.onRecordingProgress(),this.recordingTimestamp=g)};h()}handlePause(e){e.preventDefault(),this.mediaRecorder.pause(),this.mediaRecorder.requestData(),this.durationMillis+=Date.now()-this.startedOn,this.startedOn=null,this.setState({recording:!1})}handleResume(e){e.preventDefault(),this.state.enabled&&(this.startedOn=Date.now(),this.mediaRecorder.resume(),this.setState({recording:!0},this.visualize))}handleDelete(e){e.preventDefault(),this.durationMillis=0,this.startedOn=null,this.mediaRecorder.stop(),this.cleanUp(),this.setState({recording:!1})}handleDone(e){e.preventDefault(),this.setState({recording:!1}),this.startedOn&&(this.durationMillis+=Date.now()-this.startedOn,this.startedOn=null),this.mediaRecorder&&this.mediaRecorder.stop()}initCanvas(){this.canvasRef.current.width=2*this.canvasRef.current.offsetWidth,this.canvasRef.current.height=2*this.canvasRef.current.offsetHeight,this.canvasContext=this.canvasRef.current.getContext("2d"),this.canvasContext.lineCap="round",this.canvasContext.translate(.5,.5),this.canvasWidth=this.canvasRef.current.width,this.canvasHeight=this.canvasRef.current.height}initMediaRecording(e){return this.stream=e,p.some((t=>!!MediaRecorder.isTypeSupported(t)&&(this.mediaRecorder=new MediaRecorder(e,{mimeType:t,audioBitsPerSecond:24e3}),!0))),this.mediaRecorder?(this.audioContext=new AudioContext,this.audioInput=this.audioContext.createMediaStreamSource(e),this.audioInput?(this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=256,this.audioInput.connect(this.analyser),this.mediaRecorder.onstop=e=>{this.durationMillis>c.rX?this.getRecording(this.mediaRecorder.mimeType).then((e=>this.props.onFinished(e.url,e.preview,this.durationMillis))):this.props.onDeleted(),this.cleanUp()},this.mediaRecorder.ondataavailable=e=>{e.data.size>0&&this.audioChunks.push(e.data),"inactive"!=this.mediaRecorder.state&&this.getRecording(this.mediaRecorder.mimeType).then((e=>{this.setState({blobUrl:e.url,preview:e.preview})}))},this.durationMillis=0,this.startedOn=Date.now(),this.mediaRecorder.start(),this.visualize(),this.props.onRecordingProgress(),void(this.recordingTimestamp=this.startedOn)):(console.warn("createMediaStreamSource returned null: audio input unavailable"),void this.props.onError(this.props.intl.formatMessage(v.failed_to_init_audio)))):(console.warn("MediaRecorder failed to initialize: no supported audio formats"),void this.props.onError(this.props.intl.formatMessage(v.failed_to_init_audio)))}getRecording(e){e=e||m;let t=new Blob(this.audioChunks,{type:e});return(e==m?h()(t,e):Promise.resolve(t)).then((e=>(t=e,e.arrayBuffer()))).then((e=>this.audioContext.decodeAudioData(e))).then((e=>this.createPreview(e))).then((e=>({url:window.URL.createObjectURL(t),preview:(0,d.JG)(e)})))}createPreview(e){const t=e.getChannelData(0),i=Math.min(t.length,96),s=t.length/i|0,a=Math.max(1,s/10|0);let n=[],r=-1;for(let e=0;e<i;e++){let i=0,o=0;for(let n=0;n<s;n+=a)i+=t[s*e+n]**2,o++;const h=Math.sqrt(i/o);n.push(h),r=Math.max(r,h)}return r>0&&(n=n.map((e=>100*e/r|0))),n}cleanUp(){this.audioInput&&this.audioInput.disconnect(),this.stream.getTracks().forEach((e=>e.stop()))}render(){const{formatMessage:e}=this.props.intl,t="material-icons "+(this.state.enabled?"red":"gray");return a().createElement("div",{className:"audio"},a().createElement("a",{href:"#",onClick:this.handleDelete,title:e(v.icon_title_delete)},a().createElement("i",{className:"material-icons gray"},"delete_outline")),this.state.recording?a().createElement("canvas",{ref:this.canvasRef}):a().createElement(r.Z,{src:this.state.blobUrl,preview:this.state.preview,duration:this.durationMillis,short:!0}),a().createElement("div",{className:"duration"},this.state.duration),this.state.recording?a().createElement("a",{href:"#",onClick:this.handlePause,title:e(v.icon_title_pause)},a().createElement("i",{className:"material-icons"},"pause_circle_outline")):a().createElement("a",{href:"#",onClick:this.handleResume,title:e(v.icon_title_resume)},a().createElement("i",{className:t},"radio_button_checked")),a().createElement("a",{href:"#",onClick:this.handleDone,title:e(v.icon_title_send)},a().createElement("i",{className:"material-icons"},"send")))}}const g=(0,n.injectIntl)(f)}}]);
//# sourceMappingURL=252.prod.js.map
