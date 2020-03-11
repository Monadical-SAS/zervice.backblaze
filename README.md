# Backblaze B2 Upload from the browser

## Quickstart

```
git clone https://github.com/Monadical-SAS/zervice.backblaze.git
cd zervice.backblaze/
pipenv install
yarn install
b2 authorize-account  # use master key for this, not app key
# edit cors_rules.json contents
b2 update-bucket bucket-name --corsRules "$(cat cors_rules.json)"
yarn run start
open http://localhost:8085
```

## Manual Setup

1. Set up a BackBlaze account and [create a new B2 bucket](https://secure.backblaze.com/b2_buckets.html) (public)
<center><img src="https://docs.monadical.com/uploads/upload_1622299a4f50fda59c1a47b1339fa4ac.png" style="width: 200px;"><img src="https://docs.monadical.com/uploads/upload_bd0cdef7d94065930436be7e60d256aa.png" style="width: 80px;"><img src="https://docs.monadical.com/uploads/upload_ce8dd7c04edf3b9968a170cf0bdd4f49.png" style="width: 180px;">
</center>

2. Create a new Backblaze [Application Key](https://secure.backblaze.com/app_keys.htm) to authenticate your backend

<center><img src="https://docs.monadical.com/uploads/upload_e7fcb89647fa04c83937558f165021c6.png" style="width: 200px;"><img src="https://docs.monadical.com/uploads/upload_13e498f545c73b43f6bb9a9611053ebe.png" style="width: 100px;"><img src="https://docs.monadical.com/uploads/upload_ccbaa673584e97669060f3f14bd92714.png" style="width: 180px;">
</center>
<br/>

3. Update the bucket's CORS rules to allow requests from your website

```bash

b2 authorize-account  # use master key for this, not app key
b2 update-bucket bucket-name --corsRules "$(cat cors_rules.json)"
```

4. Start the webserver

```bash
yarn install
yarn run start
open http://localhost:8085
```

## Execution Flow


1. user visits `index.html`, selects a file, and `onSelectFile` is triggered
2. frontend requests a one-time B2 upload url via backend 
frontend ->
`localhost:8085/b2/getUploadUrl` -> 
server ->
`backblaze.com/api/getUploadUrl`
5. frontend calculates the file's sha1hash
6. frontend prepares upload headers for B2 for:
   - filename
   - content type
   - sha1 hash verification
   - cache control behavior
   - optional extra metadata
7. frontend uploads file from browser to server-provided B2 uploadUrl with the prepared headers




## CloudFlare Egress Setup (Optional)

Egress from BackBlaze is free if it goes through CloudFlare's network.  To take advantage of this, you just need to create a domain that's a proxied CNAME to your B2 bucket's friendly URL.

1. Create a CNAME record to point to your BackBlaze b2 bucket host
    `b2.example.com     CNAME   -> f000.backblazeb2.com (Proxied)`
2. Create a Page Rule on that domain to enable caching
    `b2.example.com/file/bukcet-name/*`: `Always cache`
    
```bash
# or do the same thing via the API
curl -X PUT "https://api.cloudflare.com/client/v4/zones/023e105f4ecef8ad9ca31a8372d0c353/dns_records/372e67954025e0ba6aaa6d586b9e0b59" \
     -H "X-Auth-Email: user@example.com" \
     -H "X-Auth-Key: c2547eb745079dac9320b638f5e225cf483cc5cfdda41" \
     -H "Content-Type: application/json" \
     --data '{"type":"CNAME","name":"b2.example.com","content":"f002.backblazeb2.com","ttl":{},"proxied":true}'
```

## Notes

### Part of the upload process must take place on a server

B2 does not allow`get_upload_url` and `delete_file_version` to be called directly from browsers due to b2's CORS restrictions.

You must ask a node backend to make the request for you.

### CORS headers must be allowed with corsRules

The headers used for in-browser uploads **must* be explicitly marked allowed in your b2 bucket's `corsRules`. If not set properly, uploads will return CORS and 400 errors. The rules can be set up using the b2 CLI.

`b2 update-bucket --corsRules rules.json bucket-name`

### Hashes must match between browser and B2

Browser's hash needs to match backblaze's hash result exactly or the b2 upload will fail with a 400 error.

Footgun: use ``'do_not_verify'`` as the hash to disable hash verification.

### Content-Type should be set explicitly

Always explicity pick the expected content type (e.g. 'audio/mpeg', 'application/octet-stream', etc.) to prevent accidentally reflecting user-uploads as public runnable JS/HTML/viruses/etc types to others.

Footgun: use ``'b2/x-auto'`` as the ctype to have b2 autodetect it.

### Filenames in B2 should not be user-defined

Your B2 filenames will be served via public URLs on your domain.
Beware of using user-provided filenames! Do you really want someont to upload `yourfiles.com/passwod_reset.html`?

Tip: you can use the hash as the name instead

### The `Content-Length` header does not need to be set

The Content-Length header will be automatically set to the correct length by the browser making the upload request.

### Axios dependency

While uploading can be done without `axios` to make the requests from the browser -> B2, it's more difficult to get the CORS headers right with `fetch()` or `XMLHttpRequst`.
