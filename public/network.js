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
		buffer = {};

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
		if( buffer.time!==undefined && buffer.time!==null)
		{
			var newtime = new Date().getTime(),
				diff = newtime-lasttime;
			if( diff > target_interval-10) //too slow
			{
				var result = timer_callback(buffer.time,buffer.data,next_frame);
				lasttime = newtime;
				buffer.time=null;
				buffer.data=null;
				if( result)
					next_frame(result);
			}
		}
	}
	
	function setup_websocket(host,active,id1,id2)
	{
		host = host.replace(/^http/,'ws')+'/peer';
		if( !id1 || !id2)
		{
			log('network: no id.');
			return false;
		}
		var time = 0,
			connected = {},
			ws; //connection
		var console_log = document.getElementById('console-log');
		connectws();
		
		function dataframe(time,data)
		{
			buffer.time = time;
			buffer.data = data;
			frame();
		}
		
		next_frame=function(data)
		{
			ws.send(JSON.stringify({name:id1,target:id2,t:time,d:data}));
			if( !active)
				time++;
		}
		
		function connectws()
		{
			if( active)
				active_connect();
			if( !active)
				passive_connect();
		}
		function active_connect()
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
						ws.send(JSON.stringify({name:id1,target:id2,m:'hi',id:id1})); //handshake
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
				data = JSON.parse(mess.data);
				if( data.m==='hi')
				{
					if( data.id===id2 && !connected[data.id]) //verify id
					{
						log('handshake success');
						connected[data.id] = true;
						cid = data.id;
						dataframe(time,data.d);
						if( retry)
						{
							clearInterval(retry);
							retry = null;
						}
					}
					else
					{
						log('unknown peer');
					}
				}
				else if( cid)
				{
					if( data.t!==time)
						log('out of sync',data.t,time);
					else
					{
						if( active)
							time++;
						dataframe(time,data.d);
					}
				}
			}
		}
		function passive_connect()
		{
			var cid;
			ws = new WebSocket(host);
			ws.onopen=function()
			{
				log('web socket opened');
				ws.send(JSON.stringify({open:'open',name:id1}));
			}
			ws.onclose=function()
			{
				log('socket closed');
			}
			ws.onmessage=function(mess)
			{
				data = JSON.parse(mess.data);
				if( data.m==='hi')
				{
					if( data.id===id2 && !connected[data.id]) //verify id
					{
						log('handshake success');
						ws.send(JSON.stringify({name:id1,target:id2,m:'hi',id:id1})); //handshake
						connected[data.id] = true;
						cid = data.id;
					}
					else
					{
						log('unknown peer');
					}
				}
				else if( cid)
				{
					if( data.t!==time)
						log('out of sync');
					else
					{
						dataframe(time,data.d);
					}
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