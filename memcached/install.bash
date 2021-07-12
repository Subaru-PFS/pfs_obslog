prefix=$HOME/memcached

workdir=~/tmp/memcached-build
mkdir -p $workdir

cd $workdir
(
  curl -LO curl -LO https://github.com/libevent/libevent/releases/download/release-2.1.12-stable/libevent-2.1.12-stable.tar.gz
  tar xvzf libevent-2.1.12-stable.tar.gz
  cd libevent-2.1.12-stable
  ./configure --prefix=$prefix --disable-openssl
  make -j2
  make install
)
(
  curl -LO https://memcached.org/files/memcached-1.6.9.tar.gz
  tar vxzf memcached-1.6.9.tar.gz
  cd memcached-1.6.9
  ./configure --prefix=$prefix
  make -j2
  make install
)
