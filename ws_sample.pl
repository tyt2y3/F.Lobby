use Mojolicious::Lite;

websocket '/echo' => sub {
  my $self = shift;
  $self->on(json => sub {
    my ($self, $hash) = @_;
    $hash->{msg} = "echo: $hash->{msg}";
    $self->send({json => $hash});
  });
};

get '/' => 'index';

app->start;
__DATA__

@@ index.html.ep
<!DOCTYPE html>
<html>
  <head>
    <title>Echo</title>
    <script>
      var ws = new WebSocket('<%= url_for('echo')->to_abs %>');
      ws.onmessage = function (event) {
        document.body.innerHTML += JSON.parse(event.data).msg;
      };
      ws.onopen = function (event) {
        ws.send(JSON.stringify({msg: 'I ♥ Mojolicious!'}));
      };
    </script>
  </head>
</html>