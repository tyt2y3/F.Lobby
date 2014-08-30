/*\
 * network: p2p networking via websocket
\*/

(function (window) {

if( typeof define !=='undefined')
	define([],define_module);
else
	window.network = define_module();

function define_module()
{
	var timer_callback,
		target_interval,
		next_frame,
		lasttime = new Date().getTime(),
		buffer = [];

	function set_interval(a,b)
	{
		if( !timer_callback)
		{
			timer_callback = a;
			target_interval = b;
			if( target_interval>=30)
				target_interval-=1; //make it slightly faster
			return setInterval(frame,target_interval*0.5);
		}
		else
			console.log('network: error: only one timer can be active at a time. please `clearInterval` before setting a new one.');
	}
	function clear_interval(a)
	{
		clearInterval(a);
		timer_callback = null;
	}
	function frame() //timer frame
	{
		if( timer_callback)
		if( buffer[0])
		{
			var newtime = new Date().getTime(),
				diff = newtime-lasttime;
			if( diff > target_interval-5) //too slow
			{
				var result = timer_callback(buffer[0].time,buffer[0].data,next_frame);
				lasttime = newtime;
				buffer.shift();
				if( result)
					next_frame(result);
			}
		}
	}
	function dataframe(time,data)
	{
		buffer.push({time:time,data:data});
		frame();
	}
	
	function setup_websocket(host,id1,id2)
	{
		host = host.replace(/^http/,'ws')+'/peer';
		if( !id1 || !id2)
		{
			log('invalid id.');
			return false;
		}
		var time = 0,
			connected,
			ws; //connection
		var console_log = document.getElementById('console-log');
		connectws();
		
		next_frame=function(data)
		{
			ws.send(JSON.stringify({name:id1,target:id2,t:time,d:data}));
		}
		
		function connectws()
		{
			var retry;
			var num_tried=0;
			ws = new WebSocket(host);
			ws.onopen=function()
			{
				log('web socket opened');
				ws.send(JSON.stringify({open:'open',name:id1}));
				retry = setInterval(function(){
					log('initiate handshake...');
					if( retry)
						ws.send(JSON.stringify({name:id1,target:id2,m:'hi'})); //handshake
					if( num_tried++ >=9)
					{
						clearInterval(retry);
						retry = null;
						log('peer connection failed');
					}
				},1000);
			}
			ws.onclose=function()
			{
				log('socket closed');
			}
			ws.onmessage=function(mess)
			{
				var data = JSON.parse(mess.data);
				if( data.m==='hi')
				{
					ws.send(JSON.stringify({name:id1,target:id2,m:'hi back'})); //handshake
				}
				else if( data.m==='hi back')
				{
					if( data.name===id2 && !connected) //verify id
					{
						log('handshake success');
						connected = data.name;
						if( retry)
						{
							clearInterval(retry);
							retry = null;
						}
						dataframe(time,data.d);
					}
					else
					{
						log('unknown peer');
					}
				}
				else if( data.mm)
				{
					onmessage(data.mm);
				}
				else if( connected)
				{
					time++;
					dataframe(time,data.d);
				}
			}
		}
		function log(mess)
		{
			if( console_log) console_log.value+=mess+'\n';
		}
	}
	
	return {
		setup_peer:setup_websocket,
		setInterval:set_interval,
		clearInterval:clear_interval
	}
}

}(window));
